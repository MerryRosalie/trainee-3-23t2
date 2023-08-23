import getLogger from "src/utils/logger";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import errorHandler from "middleware-http-errors";
import { loginUser, logoutUser, registerUser } from "./functions/auth";
import { validateRequest, verifySession } from "./utils/middleware";
import { UserLoginSchema, UserRegisterSchema } from "./schema/user.schema";
import {
  AllPostsSchema,
  LikePostSchema,
  NewPostSchema,
  PostType,
} from "./schema/post.schema";
import {
  createNewPost,
  deletePost,
  getAllPosts,
  getPost,
  likePost,
  updatePost,
} from "./functions/post";
import { getAllThemes } from "./functions/theme";
import { verifyToken } from "./utils/token";
import {
  CommentType,
  LikeCommentSchema,
  PostCommentSchema,
} from "./schema/comment.schema";
import {
  createNewComment,
  deleteComment,
  editComment,
  likeComment,
} from "./functions/comment";

const logger = getLogger();
const app = express();

app.use(cors());
app.use(express.json());

// HEALTH CHECK
app.get("/", (req: Request, res: Response) => {
  logger.info("Health check");
  return res.status(200).json({
    message: "This server is healthy :D",
  });
});

// REGISTER USER
app.post(
  "/auth/register",
  validateRequest(UserRegisterSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to POST /auth/register");
    try {
      const { username, email, password } = req.body;
      const result: {
        token: string;
        expiredBy: Date;
        userId: string;
      } = await registerUser(username, email, password);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// LOGIN USER
app.post(
  "/auth/login",
  validateRequest(UserLoginSchema, "body"),
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to POST /auth/login");
    try {
      const { username, password } = req.body;
      const result: {
        token: string;
        expiredBy: Date;
        userId: string;
      } = await loginUser(username, password);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// LOGOUT USER
app.post(
  "/auth/logout",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to POST /auth/logout");
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      const result: Record<never, never> = await logoutUser(token as string);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET ALL THEMES
app.get("/themes", async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Responding to /themes");
  const result = await getAllThemes();
  return res.status(200).json(result);
});

// GET POSTS (FOR HOMEPAGE)
app.get(
  "/posts",
  validateRequest(AllPostsSchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to GET /posts");
    try {
      const { offset } = req.query;
      // If can be verified, return a personal posts homepage
      if (
        await verifyToken(
          req.headers.authorization,
          req.headers.id as string | undefined
        )
      ) {
        const result: { posts: PostType[] } = await getAllPosts(
          Number(offset),
          req.headers.id as string
        );
        return res.status(200).json(result);
      }
      const result: { posts: PostType[] } = await getAllPosts(Number(offset));
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// MAKE NEW POST
app.post(
  "/post",
  [verifySession, validateRequest(NewPostSchema, "body")],
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to POST /post");
    try {
      const { id } = req.headers;
      const { message, images, anonymous, themeId } = req.body;
      const result: PostType = await createNewPost(
        id as string,
        message,
        images,
        anonymous,
        themeId
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET SPECIFIC POST INFORMATION
app.get(
  "/post/:postId",
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to GET /post/:id");
    try {
      const { postId } = req.params;
      const result: PostType = await getPost(postId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// EDIT POST
app.put(
  "/post/:postId",
  [verifySession, validateRequest(NewPostSchema, "body")],
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to PUT /post/:id");
    try {
      const { id } = req.headers;
      const { postId } = req.params;
      const { message, images, anonymous, themeId } = req.body;
      const result: PostType = await updatePost(
        id as string,
        postId,
        message,
        images,
        anonymous,
        themeId
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE POST
app.delete(
  "/post/:postId",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to DELETE /post/:postId");
    try {
      const { postId } = req.params;
      const { id } = req.headers;
      const result: Record<never, never> = await deletePost(
        id as string,
        postId
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// LIKE OR UNLIKE A POST
app.post(
  "/post/like/:postId",
  [verifySession, validateRequest(LikePostSchema, "body")],
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to POST /post/like/:postId");
    try {
      const { id: userId } = req.headers;
      const { postId } = req.params;
      const { like } = req.body;
      const result: Record<never, never> = await likePost(
        userId as string,
        postId,
        like
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// COMMENT TO A POST
app.post(
  "/comment/:postId",
  [verifySession, validateRequest(PostCommentSchema, "body")],
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to POST /comment/:postId");
    try {
      const { id: userId } = req.headers;
      const { postId } = req.params;
      const { message, images, anonymous } = req.body;
      const result: CommentType = await createNewComment(
        userId as string,
        postId,
        message,
        images,
        anonymous
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// EDIT COMMENT TO A POST
app.put(
  "/comment/:commentId",
  [verifySession, validateRequest(PostCommentSchema, "body")],
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to PUT /comment/:commentId");
    try {
      const { id: userId } = req.headers;
      const { commentId } = req.params;
      const { message, images, anonymous } = req.body;
      const result: CommentType = await editComment(
        userId as string,
        commentId,
        message,
        images,
        anonymous
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE COMMENT TO A POST
app.delete(
  "/comment/:commentId",
  [verifySession],
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to DELETE /comment/:commentId");
    try {
      const { commentId } = req.params;
      const { id: userId } = req.headers;
      const result: Record<never, never> = await deleteComment(
        userId as string,
        commentId
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// LIKE OR UNLIKE A COMMENT
app.post(
  "/comment/like/:commentId",
  [verifySession, validateRequest(LikeCommentSchema, "body")],
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Responding to POST /comment/like/:commentId");
    try {
      const { id: userId } = req.headers;
      const { commentId } = req.params;
      const { like } = req.body;
      const result: Record<never, never> = await likeComment(
        userId as string,
        commentId,
        like
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// TODO: REPLY TO A COMMENT

// TODO: EDIT A REPLY

// TODO: DELETE A REPLY

// TODO: LIKE OR UNLIKE A REPLY

// TODO: GET USER INFORMATION

// TODO: UPDATE USER INFORMATION

// TODO: DELETE USER

app.use(errorHandler());

// SERVER
app.listen(3030, () => {
  logger.info("Server starting");
});
