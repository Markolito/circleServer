const express = require('express');
const Feed = require('../models/feed');
const authenticate = require('../authenticate');

const feedRouter = express.Router();

feedRouter.route('/')
.get((req, res, next) => {
    Feed.find()
    //.populate('comments.author')
    .then(feeds => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(feeds);
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Feed.create(req.body)
    .then(feed => {
        console.log('feed Created ', feed);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(feed);
    })
    .catch(err => next(err));
})
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /feeds');
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Feed.deleteMany()
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

feedRouter.route('/:feedId')
.get((req, res, next) => {
    Feed.findById(req.params.feedId)
    .populate('comments.author')
    .then(feed => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(feed);
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /feeds/${req.params.feedId}`);
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Feed.findByIdAndUpdate(req.params.feedId, {
        $set: req.body
    }, { new: true })
    .then(feed => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(feed);
    })
    .catch(err => next(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Feed.findByIdAndDelete(req.params.feedId)
    .then(response => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    })
    .catch(err => next(err));
});

feedRouter.route('/:feedId/comments')
.get((req, res, next) => {
    Feed.findById(req.params.feedId)
    .populate('comments.author')
    .then(feed => {
        if (feed) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(feed.comments);
        } else {
            err = new Error(`Feed ${req.params.feedId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res, next) => {
    Feed.findById(req.params.feedId)
    .then(feed => {
        if (feed) {
            req.body.author = req.user._id;
            feed.comments.push(req.body);
            feed.save()
            .then(feed => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(feed);
            })
            .catch(err => next(err));
        } else {
            err = new Error(`Feed ${req.params.feedId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.put(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`PUT operation not supported on /feeds/${req.params.feedId}/comments`);
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Feed.findById(req.params.feedId)
    .then(feed => {
        if (feed) {
            for (let i = (feed.comments.length-1); i >= 0; i--) {
                feed.comments.id(feed.comments[i]._id).remove();
            }
            feed.save()
            .then(feed => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(feed);
            })
            .catch(err => next(err));
        } else {
            err = new Error(`Feed ${req.params.feedId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});

feedRouter.route('/:feedId/comments/:commentId')
.get((req, res, next) => {
    Feed.findById(req.params.feedId)
    .populate('comments.author')
    .then(feed => {
        if (feed && feed.comments.id(req.params.commentId)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(feed.comments.id(req.params.commentId));
        } else if (!feed) {
            err = new Error(`feed ${req.params.feedId} not found`);
            err.status = 404;
            return next(err);
        } else {
            err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.post(authenticate.verifyUser, (req, res) => {
    res.statusCode = 403;
    res.end(`POST operation not supported on /feeds/${req.params.feedId}/comments/${req.params.commentId}`);
})
.put(authenticate.verifyUser, (req, res, next) => {
Feed.findById(req.params.feedId) 
    .then(feed => {
        if (feed && feed.comments.id(req.params.commentId)) {
            if ((feed.comments.id(req.params.commentId).author._id).equals(req.user._id)) {
                if (req.body.rating) {
                    feed.comments.id(req.params.commentId).rating = req.body.rating;
                }
                if (req.body.text) {
                    feed.comments.id(req.params.commentId).text = req.body.text;
                }
                feed.save()
                .then(feed => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(feed);
                })
                .catch(err => next(err));
            }else{
                err = new Error("You are not authorized to delete this comment.");
                err.status = 403;
                return next(err);
            }
        } else if (!feed) {
            err = new Error(`Feed ${req.params.feedId} not found`);
            err.status = 404;
            return next(err);
        } else {
            err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
})
.delete(authenticate.verifyUser, (req, res, next) => {
    Feed.findById(req.params.feedId)
    .then(feed => {
        if (feed && feed.comments.id(req.params.commentId)) { 
            if ((feed.comments.id(req.params.commentId).author._id).equals(req.user._id)) {
                feed.comments.id(req.params.commentId).remove();
                feed.save()
                .then(campsite => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(campsite);
                })
            .catch(err => next(err));
            }else{
                err = new Error("You are not authorized to delete this comment.");
                err.status = 403;
                return next(err);
            }
        } else if (!feed) {
            err = new Error(`Feed ${req.params.feedId} not found`);
            err.status = 404;
            return next(err);
        } else {
            err = new Error(`Comment ${req.params.commentId} not found`);
            err.status = 404;
            return next(err);
        }
    })
    .catch(err => next(err));
});


module.exports = feedRouter;

