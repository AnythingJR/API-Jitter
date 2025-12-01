import express from 'express'

/*declarando o express como função*/
const app = express()
/*utilizando JSON*/
app.use(express.json())

const order = []

/*criando pedido*/
app.post('/order', (req, res) => {

    order.push(req.body)


    res.send ('pedido criado com sucesso!')
})

app.listen(3000)