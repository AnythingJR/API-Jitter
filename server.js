import express from 'express'

/*declarando o express como função*/
const app = express()

/*chamando a consulta*/
app.get('/pedido', (req,res) => {
    res.send ('ok, consultou')
})

app.listen(3000)