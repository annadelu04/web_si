import multer from 'multer';
import path from 'path';

// Configurazione di dove salvare i file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Cartella dove salvare
    },
    filename: (req, file, cb) => {
        // Genera un nome unico: data-attuale + nome-originale
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro per accettare solo immagini e video
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato file non supportato'), false);
    }
};

export const upload = multer({ storage: storage, fileFilter: fileFilter });