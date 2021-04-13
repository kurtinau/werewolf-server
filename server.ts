import * as dotenv from "dotenv";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server, Socket } from "socket.io";
import winston from 'winston';

dotenv.config();


if (!process.env.PORT) {
    process.exit(1);
 }
 
 const PORT: number = parseInt(process.env.PORT as string, 10);
 
 const app = express();



app.use(helmet());
app.use(cors());
app.use(express.json());

const isProduction = process.env.NODE_ENV;

// winston logging
const myFormat = winston.format.printf(logEntryObj => {
    return `${logEntryObj.timestamp} ${logEntryObj.level}: ${logEntryObj.message}`;
})
const combinedFormat = winston.format.combine(winston.format.timestamp(), myFormat)
const logger = winston.createLogger({
    level: 'info',
    format: combinedFormat,
    transports: [
        new winston.transports.File({ filename: 'combined.log' })
    ]
})
if (!isProduction) {
    logger.add(new winston.transports.Console({
        format: combinedFormat
    }))
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  // ...
});

io.on("connection", (socket: Socket) => {
    console.log(socket.id);
});

httpServer.listen(PORT,()=>{
    console.log(`Listening on port ${PORT}`);
});