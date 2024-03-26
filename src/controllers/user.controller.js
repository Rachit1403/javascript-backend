import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { tokenOptions } from "../constants.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating Access and Refresh Token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    //get data from the front-end
    //validate if the fields are not empty
    //check if the user already exists
    //check for images
    //upload them to cloudinary
    //create user object - db entry
    //check if the user is created
    //return response

    const { fullName, username, email, password } = req.body;

    if (
        [fullName, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required!");
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser)
        throw new ApiError(409, "User with email or username already exists!");

    const avatarLocalPath = req.files?.avatar[0].path;
    console.log("avatar-local:- ", avatarLocalPath);
    let coverImageLocalPath;

    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("avatar:-", avatar);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required!");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user.id).select(
        "-password -refreshToken"
    );

    if (!createdUser)
        throw new ApiError(
            500,
            "Something went wrong while regestering the user"
        );

    return res
        .status(200)
        .json(
            new ApiResponse(200, createdUser, "user registered successfully!")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!(username || email))
        throw new ApiError(400, "Username or E-mail is required!");

    const user = await User.findOne({ $or: [{ username }, { email }] });

    if (!user) throw new ApiError(401, "Invalid Username or E-mail");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials!");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, tokenOptions)
        .cookie("refreshToken", refreshToken, tokenOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User LoggedIn Successfully!"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    //find user by id and update the refreshToken

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .clearCookie("accessToken", "", tokenOptions)
        .clearCookie("refreshToken", "", tokenOptions)
        .json(new ApiResponse(200, {}, "Logout successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    //use the refresh token from cookies
    //verify with the db
    //if verified, generate new access token
    //return res and set cookies

    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request!");

    try {
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedRefreshToken._id).select(
            "-password"
        );
        if (!user) throw new ApiError(401, "Invalid Refresh Token");

        if (incomingRefreshToken !== user?.refreshToken)
            throw new ApiError(401, "Refresh Token is expired or used!");

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
            user._id
        );

        return res
            .status(200)
            .cookie("accessToken", accessToken, tokenOptions)
            .cookie("refreshToken", refreshToken, tokenOptions)
            .json(
                new ApiResponse(
                    201,
                    { accessToken, refreshToken },
                    "Successfully refreshed Access Token!"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Token");
    }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
