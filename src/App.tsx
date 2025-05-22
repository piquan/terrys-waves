import * as React from 'react';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Modal from '@mui/material/Modal';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import Converter from './Converter.tsx';
import Legal from './Legal.tsx';
import logo from '/favicon.svg';

function TheAppBar({ onLegal }: { onLegal: () => void }) {
    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton size="large" edge="start" color="inherit"
                                sx={{ mr: 2 }} >
                        <img width={24} height={24} src={logo} alt="" />
                    </IconButton>
                    <Typography variant="h6" component="div"
                                sx={{ flexGrow: 1 }}>
                        Terry&rsquo;s Waves
                    </Typography>
                    <Button color="inherit" onClick={onLegal}>Legal</Button>
                </Toolbar>
            </AppBar>
        </Box>
    );
}

function App() {
    const [legalVisible, setLegalVisible] = React.useState(false);
    const openLegal = () => setLegalVisible(true);
    const closeLegal = () => setLegalVisible(false);

    return <>
        <TheAppBar onLegal={openLegal} />
        <Container sx={{ mt: 1 }}>
            <Converter />
        </Container>
        <Modal open={legalVisible} onClose={closeLegal}>
            <Legal />
        </Modal>
    </>;
}

export default App;
