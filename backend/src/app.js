import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {pool} from './db/config.js';

const app = express();
const port=process.env.PORT || 3000;

// Cofigurations
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}))

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({extended: true, limit: '16kb'}));
app.use(express.static('public'));
app.use(cookieParser())

app.get('/', async(req, res)=>{
    try{
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({
            message: 'Database connected successfully',
            currentTime: result.rows[0].now,
        })
    } catch (err) {
        console.error(`Database Connection Error`,err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

app.listen(port, ()=>{
    console.log(`Server is running on port http://localhost:${port}`);
});