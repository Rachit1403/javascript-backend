import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

    const existingUser = await User.findOne({ $or: [username, email] });

    if (existingUser) throw new ApiError(409, "User already exists!");

    const avatarLocalPath = req.files?.avatar[0].path;

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

    const avatar = uploadOnCloudinary(avatarLocalPath);
    const coverImage = uploadOnCloudinary(coverImageLocalPath);

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

export { registerUser };
