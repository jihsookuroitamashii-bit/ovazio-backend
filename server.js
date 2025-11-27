import express from 'express'
const app = express()
app.get('/', (req,res)=>res.send('Backend do Reino de Klintar ativo'))
app.listen(3001)