import * as React from 'react';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import Converter from './Converter.tsx';
import logo from '/favicon.svg';

function TheAppBar() {
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
                </Toolbar>
            </AppBar>
        </Box>
    );
}

function App() {
    return <>
        <TheAppBar />
        <Container sx={{ mt: 1 }}>
            <Converter />
        </Container>
    </>;
}

export default App;
