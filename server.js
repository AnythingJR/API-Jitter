import express from 'express'

/*declarando o express como função*/
const app = express()

/*criando pedido*/
app.post('/order', (req, res) => {


console.log(req)

    res.send ('pedido criado com sucesso!')
})

app.listen(3000)