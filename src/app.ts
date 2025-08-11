import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { celebrate, Joi, Segments } from "celebrate";
import prisma from "./database/client";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "3000";

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
   next();
});

app.get("/health", (req, res) => {
   res.status(200).json({
      success: true,
      message: "URL Shortener API está funcionando",
      timestamp: new Date().toISOString(),
   });
});

app.post(
   "/",
   celebrate({
      [Segments.BODY]: Joi.object().keys({
         url: Joi.string().required(),
      }),
   }),
   async (
      request: Request<
         any,
         any,
         {
            url: string;
         }
      >,
      response: Response
   ) => {
      const { url } = request.body;

      const hash = crypto.createHash("sha256").update(url).digest("hex");

      await prisma.uRLShortener.create({
         data: {
            hash: hash,
            url,
         },
      });

      response.status(201).send({
         response: {
            message: "Success",
            shortURL: hash,
         },
      });
   }
);

app.get(
   "/:hash",
   async (request: Request<{ hash: string }>, response: Response) => {
      const { hash } = request.params;

      const verifyExist = await prisma.uRLShortener.findFirst({
         where: {
            hash: hash,
         },
      });
      if (!verifyExist) {
         return response.status(200).send({
            response: {
               message: "Failed",
            },
         });
      }

      return response.status(200).send({
         response: {
            message: "Success",
            url: verifyExist.url,
         },
      });
   }
);

app.use("*", (req, res) => {
   res.status(404).json({
      success: false,
      error: "Rota não encontrada",
      path: req.originalUrl,
   });
});

app.use(
   (
      error: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
   ) => {
      console.error("Erro global:", error);

      res.status(500).json({
         success: false,
         error: "Erro interno do servidor",
         message:
            process.env.NODE_ENV === "development" ? error.message : undefined,
      });
   }
);

app.listen(PORT, () => {
   console.log("API running");
});
