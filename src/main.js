import {createApp} from 'vue';

import App from './App.vue';
import '@/assets/styles.scss';

import 'primeflex/primeflex.min.css';
import 'primeicons/primeicons.css'
import "vue3-json-viewer/dist/vue3-json-viewer.css";

import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import {definePreset} from "@primevue/themes";
import JsonViewer from "vue3-json-viewer";
import ConfirmationService from 'primevue/confirmationservice';
import {loadLanguage} from '@/utils/i18n.js';
import {loadTheme} from '@/utils/theme.js';

const app = createApp(App);

const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#f4fafe',
            100: '#cae6fc',
            200: '#a0d2fa',
            300: '#75bef8',
            400: '#4baaf5',
            500: '#2196f3',
            600: '#1c80cf',
            700: '#1769aa',
            800: '#125386',
            900: '#0d3c61',
            950: '#0a2a47'
        },
        formField: {
            borderRadius: '0.8rem',
            paddingX: '1rem'
        },
    }
});

app.use(PrimeVue, {
    ripple: true,
    theme: {
        preset: MyPreset,
        options: {
            darkModeSelector: '.dark-mode'
        }
    }
});

app.use(JsonViewer);
app.use(ConfirmationService);

loadLanguage();
loadTheme();

app.mount("#app");
