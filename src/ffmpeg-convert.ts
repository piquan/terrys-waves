import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// These are the channel assignments for WAV files that don't have one
// set in the file.
//
// We only use this if ffmpeg (actually ffprobe) didn't assign a
// channel_layout.  If it does, then we instead just use the channel
// numbers: it's hard to parse the ffmpeg channel layout string.
const wavChannelLayout = [
    "FL", "FR", "FC", "LF", "BL", "BR", "FLC", "FRC", "BC",
    "SL", "SR", "TC", "TFL", "TFC", "TFR", "TBL", "TBC", "TBR"];

// Terry's equipment seems to not recognize files with a
// WAVE_FORMAT_EXTENSIBLE structure.  For PCM / float without the extensible
// header, the only valid formats are u8, s16, and f32.  (There's also
// other formats like uLaw / ALaw, but I don't know if his equipment
// supports them.)  The file structure would can express (for instance)
// 24-bit, but the spec says that these aren't allowed.
const allowedCodecs = {"pcm_u8": true, "pcm_s16le": true, "pcm_f32le": true};

let loadParameters: Promise | null = null;

export async function ffmpegConvert(inputFile: File): Promise<File[]> {
    const dotPos = inputFile.name.lastIndexOf(".");
    const [prefix, suffix] = (
        dotPos === -1 ? [inputFile.name + "-", ".wav"] :
        [inputFile.name.substring(0, dotPos) + "-",
            inputFile.name.substring(dotPos)]
    );

    const ffmpeg = new FFmpeg();

    // For reasons I don't understand, @ffmpeg/core is distributed
    // via unpkg.  You don't have a straightforward way to load it
    // through npm that I see.  To avoid CORS issues, we also have
    // to load it using fetch, and put that into a blob URL.
    //
    // The sample code never frees the blob URL, so instead we cache
    // it in a promise and reuse the blob URL.
    if (loadParameters === null) {
        loadParameters = (async function() {
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
            return {
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,
                                         'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`,
                                         'application/wasm'),
                // Only used for multithreading (@ffmpeg/core-mt):
                //workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`,
                //                           "text/javascript"),
            };
        })();
    }
    await ffmpeg.load(await loadParameters);

    const inputFilename = `input${suffix}`;
    await ffmpeg.writeFile(inputFilename, await fetchFile(inputFile));

    const ffprobeMessageArray = [];
    const logToFfprobe = ({ message }) => {
        console.log(message);
        ffprobeMessageArray.push(message);
    };
    ffmpeg.on('log', logToFfprobe);
    // For some reason, I'm getting a -1 return code on success.
    // I just ignore it.  I still get a >0 code on error, so I can
    // use that.
    const ffprobeExitCode = await ffmpeg.ffprobe([
        '-hide_banner', '-of', 'json', '-select_streams', 'a',
        '-show_error', '-show_format', '-show_streams',
        '-o', 'ffprobe.json', inputFilename]);
    if (ffprobeExitCode > 0) {
        throw new Error(`Error reading input file:\n${ffprobeMessageArray.join("\n")}`);
    }
    ffmpeg.off('log', logToFfprobe);
    const ffprobeJson = await ffmpeg.readFile('ffprobe.json', 'utf8');
    const ffprobe = JSON.parse(ffprobeJson);
    console.log("Input structure:", ffprobe);
    if (!(ffprobe.streams?.length))
        throw new Error("No audio streams found");
    if (ffprobe.streams.length > 1)
        throw new Error("Multiple audio streams (not just channels) found");
    const streamFmt = ffprobe.streams[0];
    const channelCount = streamFmt.channels;
    const codec = allowedCodecs[streamFmt.codec_name] ? streamFmt.codec_name :
                  streamFmt.bits_per_sample > 16 ? "pcm_f32le" :
                  streamFmt.bits_per_sample > 8 ? "pcm_s16le" :
                  "pcm_u8";

    console.log("Starting ffmpeg");
    const ffmpegMessageArray = [];
    const logToFfmpeg = ({ message }) => {
        ffmpegMessageArray.push(message);
        console.log(message);
    };
    ffmpeg.on('log', logToFfmpeg);
    const outputPatchNames = Array.from(
        {length:channelCount}, (_, n)=>`[o${n}]`);
    const outputFileNames = Array.from(
        {length:channelCount}, (_, n)=>`output${n}.wav`);
    const filter = `aresample=48000,channelsplit=channel_layout=${channelCount}c${outputPatchNames.join("")}`;
    const ffmpegArgs = ['-hide_banner', '-i', inputFilename,
                        '-filter_complex', filter];
    for (let ch = 0; ch < channelCount; ch++) {
        ffmpegArgs.push("-map", outputPatchNames[ch],
                        "-c", codec, "-channel_layout", "mono",
                        "-map_metadata:g", "-1",
                        outputFileNames[ch]);
    }
    const ffmpegExitCode = await ffmpeg.exec(ffmpegArgs);
    if (ffmpegExitCode > 0) {
        throw new Error(`Error converting audio:\n${ffmpegMessageArray.join("\n")}`);
    }
    ffmpeg.off('log', logToFfmpeg);

    // I could do this with Array.fromAsync, but I'm not sure if my
    // entire toolchain supports that.
    const rv = [];
    const lastModified = Date.now();
    for (let ch = 0; ch < channelCount; ch++) {
        const fileData = await ffmpeg.readFile(outputFileNames[ch], 'binary');
        const fileArray = new Uint8Array(fileData);
        const channelName = (!!streamFmt.channel_layout) ?
                            `ch${ch + 1}` :
                            wavChannelLayout[ch];
        const file = new File([fileArray],
                              `${prefix}${channelName}.wav`,
                              {type: "audio/vnd.wave", lastModified});
        rv.push(file);
    }

    // I think it'll automatically terminate when it goes out of scope,
    // but I'll be sure.
    ffmpeg.terminate();
    return rv;
}
