import express from 'express'

/*declarando o express como função*/
const app = express()
/*utilizando JSON*/
app.use(express.json())

const orders = []

/*criando pedido*/
app.post('/orders', (req, res) => {
    try {
        const { numeroPedido, valorTotal, dataCriacao, items } = req.body

        //Validação básica
        if (!numeroPedido || !valorTotal || !dataCriacao || !items) {
            return res.status(400).json({
                error: 'Dados obrigatórios não informados.'
            })
        }

        //Fazendo o mapping (transformação)
        const mappedOrder = {
            orderId: numeroPedido,
            value: valorTotal,
            creationDate: new Date(dataCriacao),
            items: items.map(item => ({
                productId: Number(item.idItem),
                quantity: item.quantidadeItem,
                price: item.valorItem
            }))
        }

        //Salvando temporariamente em memória
        orders.push(mappedOrder)

        //Retorno correto
        return res.status(201).json({
            message: 'Pedido criado com sucesso',
            order: mappedOrder
        })

    } catch (error) {
        return res.status(500).json({
            error: 'Erro interno no servidor'
        })
    }
})

const PORT = 3000
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})


app.get('/order/:id', (req, res) => {
    const { id } = req.params

    // Procurando pedido pelo ID
    const orderFound = orders.find(order => order.orderId === id)

    // Se não encontrar
    if (!orderFound) {
        return res.status(404).json({
            error: 'Pedido não encontrado'
        })
    }

    // Se encontrar
    return res.status(200).json(orderFound)
})
