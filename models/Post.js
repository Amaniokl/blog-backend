const mongoose = require('mongoose')

const {Schema, model} = mongoose;

const PostSchema = new Schema({
    title:String,
    summary:String,
    cover:String,
    content:String,
    author:{type: Schema.Types.ObjectId, ref: 'User'},
}, {
    timestamps: true
})

const Post = model('Post', PostSchema)

module.exports = Post