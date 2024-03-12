const express = require('express');
const cors = require('cors')
const mongoose = require('mongoose')
const User = require('./models/User')
const Post = require('./models/Post')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs')
const env = require('dotenv').config();



const salt = bcrypt.genSaltSync(10)
const secret = 'asjldf923ljfs09slkdfwjskld9'

const app = express()
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))
app.use(express.json())

app.use(cookieParser())

// connecting to database

const url = 'mongodb+srv://*****************@cluster0.p2b84gs.mongodb.net/'

const connect = async () => {
    try {
        await mongoose.connect(url)
        console.log('Connected to Database !!')
    } catch (error) {
        console.log(error)
    }
}


// connected to database
connect()


// register api
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt),
        });
        res.json(userDoc);
    } catch (e) {
        console.log(e);
        res.status(400).json(e);
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username });
    // first checking whether the user exists in the database if null then throw error else check the password if password is wrong then throw error
    if(userDoc === null){
        res.status(400).json('wrong credentials')
    } else {
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            // logged in
            jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json({
                    id: userDoc._id,
                    username,
                });
            });
        } else {
            res.status(400).json('wrong credentials');
        }
    }
    
});

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {
        // if (err) throw err;  // to remove the error 
        res.json(info);
    });
});

app.post('/logout', (req, res) => {
    res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
 
    // Checking if the user filled the create post form if not then error else format the image and store the details in Post database    
    if(req.file === undefined){
        res.status(400).json('error')
    } else {
        const { originalname, path } = req.file
        const { token } = req.cookies;
        const parts = originalname.split('.')
        const ext = parts[parts.length - 1]
        const newPath = path + '.' + ext
        fs.renameSync(path, newPath)
    
        const { title, summary, content } = req.body
    
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) throw err;
            const postDoc = await Post.create({
                title: title,
                summary: summary,
                cover: newPath,
                content: content,
                author: info.id
            })
            res.json(postDoc)
    
        });
    }
    



})

app.get('/post', async (req, res) => {
    const posts = await Post.find()
        .populate('author', ['username'])
        .sort({ createdAt: -1 })
        .limit(20)
    res.json(posts)
})

app.get('/post/:id', async (req, res) => {
    const { id } = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username'])
    res.json(postDoc)
})


app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    let newPath = null;
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
    }

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const { id, title, summary, content } = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if (!isAuthor) {
            return res.status(400).json('you are not the author');
        }
        await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover,
        });

        res.json(postDoc);
    });

});

// let PORT = process.env.PORT

app.listen(4000);

