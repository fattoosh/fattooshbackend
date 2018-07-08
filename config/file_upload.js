const multer = require('multer');

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, `./photos/${req.body.type}`);
//     },
//     filename: (req, file, cb) => {
//         req.body.image = Date.now() + file.originalname;
//         cb(null, req.body.image);  
//     }
// });

module.exports = multer({
    storage: multer.memoryStorage()
    // storage
});

// module.exports= multer({
//     storage: multer.memoryStorage({
//         buffuer: (req, file, cb) => {
//             console.log('ffffiiiile: ', file);
//         }
//     })
// })
