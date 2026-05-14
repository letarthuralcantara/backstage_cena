import express from 'express'; //importa o express
import morgan from 'morgan'; //importa o morgan
import cors from 'cors';
import Seed from './database/seeders.js';
import router from './routes.js';

const app = express();
const PORT = 3000;

//registro dos middlewarres
app.use(morgan('dev')); //mostrar requisições no terminal
app.use(express.json()); //conversão de de texto pra objeto js
app.use(cors()); //permissão do front-end
app.use(express.static('public')); //manda os arquivos pro front
app.use('/api/usuarios', router);  

app.get('/', (req, res) => {
    res.json({mensagem: 'API rodando'})    

})

app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(500).json({erro: 'Erro interno.'})

}); //manda mensagem de erro


app.listen(PORT, () => {
    console.log('App running on port 3000');
}); //ligar o servidor