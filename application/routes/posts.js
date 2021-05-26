var express = require('express');
var router = express.Router();
var db = require('../config/database');
const { successPrint, errorPrint } = require('../helpers/debug/debugprinters');
var sharp = require('sharp');
var multer = require('multer');
var crypto = require('crypto');
var PostError = require('../helpers/error/PostError');
const { fileURLToPath } = require('url');
const { post } = require('../app');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/upload");
    },
    filename: function (req, file, cb) {
        let fileExt = file.mimetype.split('/')[1];
        let randomName = crypto.randomBytes(22).toString("hex");
        cb(null, `${randomName}.${fileExt}`);
    }
});

var uploader = multer({ storage: storage });

router.post('/createPost', uploader.single("uploadImage"), (req, res, next) => {
    let fileUploaded = req.file.path;
    let fileAsThumbnail = `thumbnail-${req.file.filename}`;
    let destinationOfThumbnail = req.file.destination + "/" + fileAsThumbnail;
    let title = req.body.title;
    let description = req.body.description;
    let userid = req.session.userId;

    serverErr = new PostError(
        "Registration Failed: Failed to meet requirements",
        "/registration",
        200
    );
    if(title.length == 0 || description.length == 0 || userid == 0) {
        errorPrint(serverErr.getMessage());
        req.flash('error', serverErr.getMessage());
        res.status(serverErr.getStatus());
        res.redirect(serverErr.getRedirectURL());
    } else {
        successPrint('passed server side validation');
    }

    sharp(fileUploaded)
    .resize(200)
    .toFile(destinationOfThumbnail)
    .then(() => {
        let baseSql = 'INSERT INTO posts (title, description, photopath, thumbnail, created, userid) VALUE (?, ?, ?, ?, now(), ?);';
        return db.execute(baseSql, [title, description, fileUploaded, destinationOfThumbnail, userid]);
    })
    .then(([results, fields]) => {
        if(results && results.affectedRows) {
            req.flash('success', 'Your post was created successfully');
            res.redirect('/'); //destination of new post
        } else {
            throw new PostError('Post could not be created', 'postImage', 200);
        }
    })
    .catch((err) => {
        if(err instanceof PostError) {
            errorPrint(err.getMessage());
            req.flash('error', err.getMessage());
            res.status(err.getStatus());
            res.redirect(err.getRedirectURL());
        } else {
            next(err);
        }
    })
});

module.exports = router;