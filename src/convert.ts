import * as wavefile from 'wavefile';

const channelLayout = [
    "FL", "FR", "FC", "LF", "BL", "BR", "FLC", "FRC", "BC",
    "SL", "SR", "TC", "TFL", "TFC", "TFR", "TBL", "TBC", "TBR"];

// This is async because we need to read the input file, which is
// an async operation.  Otherwise, this could all be synchronous.
export async function convert(inputFile: File): Promise<File[]> {
    const dotPos = inputFile.name.lastIndexOf(".");
    const [prefix, suffix] = (
        dotPos === -1 ? [inputFile.name + "-", ".wav"] :
        [inputFile.name.substring(0, dotPos) + "-",
            inputFile.name.substring(dotPos)]
    );

    const inputArrayBuffer = await inputFile.arrayBuffer();
    const inputUint8Array = new Uint8Array(inputArrayBuffer);
    const inputWav: any = new wavefile.WaveFile(inputUint8Array);

    if (!(inputWav.fmt.audioFormat === 1 ||
          (inputWav.fmt.audioFormat === 65534 &&
           inputWav.fmt.subformat[0] === 1))) {
        throw new Error("Cannot handle this WAV encoding");
    }
    const sampleType = (
        inputWav.bitDepth === "8" ? Uint8Array :
        inputWav.bitDepth === "16" ? Int16Array :
        inputWav.bitDepth === "32" ? Int32Array :
        null);
    if (sampleType === null) {
        throw new Error(`Cannot handle bits per sample ${inputWav.fmt.bitsPerSample}`);
    }
    const inputSamples = new sampleType(
        inputWav.data.samples.buffer,
        inputWav.data.samples.byteOffset,
        inputWav.data.samples.byteLength / sampleType.BYTES_PER_ELEMENT,
    )
    const nSamples = inputWav.data.samples.byteLength / inputWav.fmt.blockAlign;
    const stride = inputWav.fmt.blockAlign / sampleType.BYTES_PER_ELEMENT;
    const lastModified = Date.now();
    const outputWavs = Array.from({length: inputWav.fmt.numChannels}, (_, chanNum) => {
        const outputSamples = new sampleType(nSamples);
        for (let sampNum = 0; sampNum < nSamples; sampNum++) {
            const idx = stride * sampNum + chanNum;
            outputSamples[sampNum] = inputSamples[idx];
        }
        const outputWav = new wavefile.WaveFile();
        outputWav.fromScratch(
            1, inputWav.fmt.sampleRate,
            inputWav.bitDepth, outputSamples);
        const outputBuffer = outputWav.toBuffer();
        // FIXME Use the channel number based on the input wav's channel mask,
        // if it exists.
        const channelName = channelLayout[chanNum] || `ch${chanNum}`;
        const filename = `${prefix}${channelName}${suffix}`;
        const outputFile = new File([outputBuffer], filename,
             {type: "audio/vnd.wave;codec=1", lastModified: lastModified});
        return outputFile;
    });
    return outputWavs;
}
