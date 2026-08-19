import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00a3e0', // MapColonies Blue
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff6f00',
    },
    background: {
      default: '#12161a',
      paper: '#1a2228',
    },
    divider: '#2c3842',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
      letterSpacing: '0.5px',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
