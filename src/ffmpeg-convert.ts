import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { LogEvent } from '@ffmpeg/ffmpeg';
import * as wavefile from 'wavefile';

import type { SampleTypeConstructor } from './wavefile-convert.ts';

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
// WAVE_FORMAT_EXTENSIBLE structure.  ffmpeg will create such a header
// in many conditions.  For reasons I can't figure out, it will do
// that if you create a pcm_f32le file.
// https://github.com/FFmpeg/FFmpeg/blob/688f3944cedf36963cf81fbd56e8022e89d038c3/libavformat/riffenc.c#L79
// It also will do that if you create a pcm_s24le file.  Terry's equipment
// can handle pcm_s24le (not sure about pcm_f32le), but not with the
// extensible header.
//
// This structure lists the acceptable output codecs.  Also, the mapping
// shows whether header conversion is needed, and if so, what the format
// code for wavefile and the sample array format is.  (For null, the
// data is passed through getSamples, which goes through float64s.)
//
// Note that float32s will trigger a warning with sox, since it wants
// to see extensible headers on everything that's not PCM, including
// floats.
const outputCodecs: Record<string, [boolean, string, SampleTypeConstructor | null]> = {
    "pcm_u8": [false, "8", Uint8Array],
    "pcm_s16le": [false, "16", Int16Array],
    "pcm_s24le": [true, "24", null],
    "pcm_s32le": [true, "32", Int32Array],
    "pcm_f32le": [true, "32f", Float32Array],
};

let loadParameters: Promise<object> | null = null;

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

    const ffprobeMessageArray: string[] = [];
    const logToFfprobe = ({ message }: LogEvent) => {
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
    const ffprobeJson = (await ffmpeg.readFile('ffprobe.json', 'utf8')) as string;
    const ffprobe = JSON.parse(ffprobeJson);
    console.log("Input file structure:", ffprobe);
    if (!(ffprobe.streams?.length))
        throw new Error("No audio streams found");
    if (ffprobe.streams.length > 1)
        throw new Error("Multiple audio streams (not just channels) found");
    const streamFmt = ffprobe.streams[0];
    const channelCount = streamFmt.channels;
    const codec = streamFmt.codec_name in outputCodecs ? streamFmt.codec_name :
                  streamFmt.bits_per_sample > 24 ? (
                      streamFmt.sample_fmt === "flt" ? "pcm_f32le" :
                      "pcm_s32le") :
                  streamFmt.bits_per_sample > 16 ? "pcm_s24le" :
                  streamFmt.bits_per_sample > 8 ? "pcm_s16le" :
                  "pcm_u8";

    console.log("Starting ffmpeg");
    const ffmpegMessageArray: string[] = [];
    const logToFfmpeg = ({ message }: LogEvent) => {
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
    const [reformat, formatCode, sampleType] = outputCodecs[codec];
    for (let ch = 0; ch < channelCount; ch++) {
        let fileData = await ffmpeg.readFile(
            outputFileNames[ch], 'binary') as Uint8Array;

        // We have to reformat the extensible header if ffmpeg emitted one,
        // which it does on pretty much anything over 16 bits.
        if (reformat) {
            const inputWav: any = new wavefile.WaveFile(fileData);
            const inputSamples =
                sampleType === null ? inputWav.getSamples(true) :
                new sampleType(
                    inputWav.data.samples.buffer,
                    inputWav.data.samples.byteOffset,
                    inputWav.data.samples.byteLength / sampleType.BYTES_PER_ELEMENT,
                );
            const outputWav = new wavefile.WaveFile;
            outputWav.fromScratch(1, 48000, formatCode, inputSamples);
            fileData = outputWav.toBuffer();
        }

        const channelName = (!!streamFmt.channel_layout) ?
                            `ch${ch + 1}` :
                            wavChannelLayout[ch];
        const file = new File([fileData],
                              `${prefix}${channelName}.wav`,
                              {type: "audio/vnd.wave", lastModified});

        rv.push(file);
    }

    // I think it'll automatically terminate when it goes out of scope,
    // but I'll be sure.
    ffmpeg.terminate();
    return rv;
}
