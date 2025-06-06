import * as React from 'react';

import { Box, Typography } from '@mui/material';
import {
    Alert,
    FormControlLabel,
    FormGroup,
    Icon,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Link,
    Skeleton,
    Switch,
} from '@mui/material';

import { ffmpegConvert } from './ffmpeg-convert.ts';
import { wavefileConvert } from './wavefile-convert.ts';

interface DownloadableFile {
    filename: string;
    url: string;
}

function ConvertInProgress() {
    return <Box>
            <List>
                <ListItem>
                    <ListItemIcon><Skeleton><Icon>download</Icon></Skeleton></ListItemIcon>
                    <ListItemText>
                        <Skeleton />
                    </ListItemText>
                </ListItem>
                <ListItem>
                    <ListItemIcon><Skeleton><Icon>download</Icon></Skeleton></ListItemIcon>
                    <ListItemText>
                        <Skeleton />
                    </ListItemText>
                </ListItem>
            </List>
        </Box>;
}

function ConvertError({error}: {error: string}) {
    return <Alert severity="error">
        Conversion failed: {error}
    </Alert>;
}

function ConvertSuccess({monoFiles}: {monoFiles: DownloadableFile[]}) {
    return <Box>
            <List>
                {monoFiles.map((file) => {
                    return (
                        <Link href={file.url} download={file.filename} key={file.url}>
                            <ListItem>
                                <ListItemIcon><Icon>download</Icon></ListItemIcon>
                                <ListItemText>{file.filename}</ListItemText>
                            </ListItem>
                        </Link>);
                })}
            </List>
        </Box>;
}

export default function Converter() {
    const [experimental, setExperimental] = React.useState(false);
    const onExperimental = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setExperimental(e.target.checked);
    }, [setExperimental]);

    // TODO: Update to use MuiFileInput.  That doesn't yet work with MUI 7,
    // but there's a PR and merge request for it.  See
    // https://github.com/viclafouch/mui-file-input/issues/60
    const [stereoFile, setStereoFile] = React.useState<File|null>(null);
    const stereoFileChanged = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList === null || fileList.length === 0) {
            setStereoFile(null);
        } else if (fileList.length === 1) {
            setStereoFile(fileList[0]);
        } else {
            setStereoFile(null);
            console.error("Multiple files selected:", fileList);
            alert("Somehow, you selected multiple files, which doesn't work");
        }
    }, [setStereoFile]);

    const [monoFiles, setMonoFiles] = React.useState<File[]|null>(null);
    const [error, setError] = React.useState<Error|null>(null);
    const [processing, setProcessing] = React.useState(false);
    React.useEffect(() => {
        setMonoFiles(null);
        setError(null);
        if (stereoFile === null) {
            setProcessing(false);
            return;
        }
        setProcessing(true);
        void (async () => {
            try {
                const newMonoFiles = await (experimental ? ffmpegConvert : wavefileConvert)(stereoFile);
                setMonoFiles(newMonoFiles);
                setError(null);
            } catch (e) {
                setMonoFiles(null);
                if (e instanceof Error) {
                    setError(e);
                } else {
                    setError(new Error(String(e)));
                }
            } finally {
                setProcessing(false);
            }
        })();
    }, [stereoFile, experimental]);
    
    const [convertDisplay, setConvertDisplay] = React.useState(<></>);
    React.useEffect(() => {
        // This is in an effect so that we aren't constantly building
        // new object URLs, and we can revoke them during cleanups.
        if (processing) {
            setConvertDisplay(<ConvertInProgress />);
            return;
        } else if (error) {
            setConvertDisplay(<ConvertError error={error.toString()} />);
            return;
        } else if (monoFiles !== null) {
            const downloadables = monoFiles.map(file => ({
                filename: file.name,
                url: URL.createObjectURL(file),
            }));
            setConvertDisplay(<ConvertSuccess monoFiles={downloadables} />);
            return () => {
                downloadables.forEach(d => {
                    URL.revokeObjectURL(d.url);
                });
            };
        } else {
            setConvertDisplay(<></>);
            return;
        }
    }, [processing, error, monoFiles]);

    return (
        <Box>
            <FormGroup>
                <FormControlLabel control={<Switch checked={experimental} onChange={onExperimental} />} label="Use Experimental Conversion" />
            </FormGroup>
            <Box>
                <Typography>Stereo input file:</Typography>
                <input accept={experimental ? "audio/*" : ".wav,.wave,audio/vnd.wave,audio/wav,audio/wave,audio/x-wav"} type="file" onChange={stereoFileChanged} />
            </Box>
            {convertDisplay}
        </Box>);
}
