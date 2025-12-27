const isDebugEnabled = () => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env.DEBUG === 'true';
    }
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.VITE_DEBUG === 'true';
    }
    return false;
};

export const debugLog = (...args) => {
    if (isDebugEnabled()) {
        console.log(...args);
    }
};

export const debugError = (...args) => {
    if (isDebugEnabled()) {
        console.error(...args);
    }
};