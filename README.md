[![Deploy to Pages](https://github.com/piquan/terrys-waves/actions/workflows/vite.yml/badge.svg)](https://github.piquan.org/terrys-waves/)

# Terry’s Waves

I have a friend named Terry.  He sometimes produces albums.  Sometimes his clients record at his studio.  Sometimes, his clients send him WAV files that they’ve recorded elsewhere.

His workflow is smoothest when he has mono WAV files, with one file per mic.  But sometimes, his clients send him stereo WAV files recorded from two mics.  For instance, they might have a guitarist at one mic, and a bassist at another mic, and record it as a single stereo WAV file.

Terry could split these files in a DAW, of course.  But that’s an annoying amount of effort for a simple task.

Instead, I wrote this program for him.  It’s a web app that splits a single WAV file into all of its component channels.

You can use it at https://github.piquan.org/terrys-waves/ if you want.  It runs entirely in your own browser, so you’re not going to overload any of my servers.

## Use

1. Go to [the website](https://github.piquan.org/terrys-waves/).
2. Click the “Choose File” button.  Or whatever the button says right under where it says “Stereo input file”.
3. Pick the WAV file from your computer.
4. On the web page, a bunch of new links will show up, one for each channel.  For instance, if you are splitting a stereo file called `hello.wav`, then you will see links named `hello-FL.wav` for the front-left channel, and `hello-FR.wav` for the front-right channel.
5. Click on each of these links to download the files.
6. Enjoy the rest of your day.

## Limitations

* This program doesn’t work with MP3, AAC, or anything else.  Just WAV.  There are no plans to support anything but WAV.
* It only works with 8-, 16-, or 32-bit linear PCM files.  These are the most common WAV files.
* It doesn’t work with floating point files (which are usually 24 bit).  It doesn’t work with A-law, μ-law, ADPCM files, etc.  These aren’t hard problems to solve; I just haven’t needed to.
* Any extra information stored in the file, like the title or artist, or playlist and cue points, will not be in the output file.
* The output will be in the same format as the input (other than being mono).  It won’t change the bit depth (8-bit, 16-bit, etc), the sample rate (8000, 44100, etc), or other aspects of the audio format.
* I don’t know how well it will work with extremely large files, where your browser doesn’t let the web page store the entire file in memory.
* I particularly doubt it will work with files over 4 GB (7 hours of CD-quality audio), which use a different WAV format than normal.
