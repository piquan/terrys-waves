import { createTheme } from '@mui/material/styles';

const themeOptions = {
    colorSchemes: {
        light: {
            palette: {
                primary: {
                    main: '#5318b3',
                },
                secondary: {
                    main: '#78b318',
                },
                error: {
                    main: '#b31878',
                },
            },
        },
        dark: {
            palette: {
                primary: {
                    main: '#824acb',
                },
                secondary: {
                    main: '#93cb4a',
                },
                error: {
                    main: '#cb4a93',
                },
            },
        },
    },
};

const theme = createTheme(themeOptions);
export default theme;
