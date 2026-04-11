import express from 'express';
import morgan from 'morgan';

const app = express();

app.use(morgan('dev'));

app.get('/hello/pt', (req, res) => {
    res.send('Olá Mundo!');
});

app.get('/hello/en', (req, res) => {
    res.send('Hello World!');
});

app.listen(3000, () => {
    console.log('App running on port 3000');
});