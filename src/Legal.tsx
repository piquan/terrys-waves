import Box from '@mui/material/Box';
import Typography from '@mui/material/Box';

function Legal() {
    return (
        <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '30%',
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            px: 4,
            pb: 4,
        }}>
            <Typography component="h2">
                Legal Copyright and Disclaimers
            </Typography>
            <Typography sx={{ mt: 2 }}>
                Copyright ©2025 Joel Ray Holveck
            </Typography>
            <Typography>
                <p>
                    This program is free software: you can redistribute
                    it and/or modify it under the terms of the GNU
                    Affero General Public License as published by the
                    Free Software Foundation, either version 3 of the
                    License, or (at your option) any later version.
                </p>
                <p>
                    This program is distributed in the hope that it will
                    be useful, but WITHOUT ANY WARRANTY; without even
                    the implied warranty of MERCHANTABILITY or FITNESS
                    FOR A PARTICULAR PURPOSE.  See the GNU Affero
                    General Public License for more details.
                </p>
                <p>
                    You should have received a copy of the GNU Affero
                    General Public License along with this program.  If
                    not, see
                    <a href="https://www.gnu.org/licenses/">https://www.gnu.org/licenses/</a>.
                </p>
            </Typography>
            <Typography component="p">
                The audio files you produce using this program are not
                covered by the program’s copyright.
            </Typography>
            <Typography component="p">
                The source code to this program is available at
                <a href="https://github.com/piquan/terrys-waves">https://github.com/piquan/terrys-waves</a>.
            </Typography>
        </Box>
    );
}

export default Legal;
