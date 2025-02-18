const express = require("express");
const userRouter = express.Router();

const Connection = require("../models/connectionModel");
const { userAuth } = require("../middlewares/userAuth");
const User = require("../models/userModel");

const USER_SAFE_DATA = ["firstName", "lastName", "gender", "skills", "profilePicture"];

userRouter.get("/user/request/received", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;

        const connectionRequest = await Connection.find({
            toUserId: loggedInUser._id,
            status: 'interested',
        }).populate("fromUserId", ["firstName", "lastName", "gender", "bio", "skills", "profilePicture"]);

        res.status(200).json({
            success: true,
            message: 'User connection received',
            data: connectionRequest,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    };
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;

        const connectionRequest = await Connection.find({
             $or:[
                {toUserId: loggedInUser._id , status: "accepted"},
                {fromUserId: loggedInUser._id, status: "accepted"},
             ],
        }).populate("fromUserId", USER_SAFE_DATA).populate("toUserId", USER_SAFE_DATA);

        const data = connectionRequest.map((row) => {
            if(row.fromUserId._id.toString() === loggedInUser._id.toString()){
                return row.toUserId
            }
            return row.fromUserId
        });

        res.status(200).json({
            success: true,
            message: `${loggedInUser.firstName}, connections`,
            data: data, 
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

userRouter.get("/feed", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const page = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 50;

        limit = limit>50 ? 50 : limit;
        const skip = (page -1)*limit;

        const connectionRequests = await Connection.find({
            $or: [{fromUserId: loggedInUser._id},{toUserId: loggedInUser._id}]
        }).select("fromUserId toUserId");

      
        const hideUsersFromFeed = new Set(); 
        connectionRequests.forEach((connection) => {
            if (connection.fromUserId) {
                hideUsersFromFeed.add(connection.fromUserId.toString());
            }
            if (connection.toUserId) {
                hideUsersFromFeed.add(connection.toUserId.toString());
            }
        });
      

        const users = await User.find({
            $and: [{ _id: {$nin: Array.from(hideUsersFromFeed)} },
                    {_id: {$ne: loggedInUser._id}},
            ],
        })
        .select(USER_SAFE_DATA)
        .skip(skip)
        .limit(limit);


        res.status(200).json({
            success: true,
            message: 'user feed',
            data: users,
        });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      })  ;
    };
});

module.exports = userRouter;