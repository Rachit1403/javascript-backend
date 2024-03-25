import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    //get accessToken of loggedIn user
    //decode the token
    //find the user using the decoded token
    //add the user data in request

    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer- ", "");

        if (!token) throw new ApiError(401, "Unauthorised request!");

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) throw new ApiError(401, "Invalid access token");

        console.log(user);

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
