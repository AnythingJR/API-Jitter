import express from 'express'

/*declarando o express como função*/
const app = express()
/*utilizando JSON*/
app.use(express.json())

import pool from './database.js'

const orders = []

app.post('/orders', async (req, res) => {
    const connection = await pool.getConnection()

    try {
        const { numeroPedido, valorTotal, dataCriacao, items } = req.body

        if (!numeroPedido || !valorTotal || !dataCriacao || !items) {
            return res.status(400).json({ error: 'Dados obrigatórios não informados' })
        }

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

        await connection.beginTransaction()

        // ✅ Inserir pedido
        await connection.query(
            `INSERT INTO \`order\` (orderId, value, creationDate)
             VALUES (?,?,?)`,
            [mappedOrder.orderId, mappedOrder.value, mappedOrder.creationDate]
        )

        // ✅ Inserir itens
        for (const item of mappedOrder.items) {
            await connection.query(
                `INSERT INTO items (orderId, productId, quantity, price)
                 VALUES (?,?,?,?)`,
                [mappedOrder.orderId, item.productId, item.quantity, item.price]
            )
        }

        await connection.commit()

        return res.status(201).json({
            message: 'Pedido salvo com sucesso',
            order: mappedOrder
        })

    } catch (error) {
        await connection.rollback()
        console.error(error)

        return res.status(500).json({
            error: 'Erro ao salvar no banco de dados'
        })

    } finally {
        connection.release()
    }
})

const PORT = 3000
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})


app.get('/orders/:id', (req, res) => {
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


// Listando todos os pedidos
app.get('/orders/list', (req, res) => {
    return res.status(200).json(orders)
})


// Atualizando um pedido pelo ID
app.put('/orders/:id', (req, res) => {
    const { id } = req.params
    const { numeroPedido, valorTotal, dataCriacao, items } = req.body

    const index = orders.findIndex(order => order.orderId === id)

    if (index === -1) {
        return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    const updatedOrder = {
        orderId: numeroPedido,
        value: valorTotal,
        creationDate: new Date(dataCriacao),
        items: items.map(item => ({
            productId: Number(item.idItem),
            quantity: item.quantidadeItem,
            price: item.valorItem
        }))
    }

    orders[index] = updatedOrder

    return res.status(200).json({
        message: 'Pedido atualizado com sucesso',
        order: updatedOrder
    })
})


// Deletando um pedido pelo ID
app.delete('/orders/:id', (req, res) => {
    const { id } = req.params

    const index = orders.findIndex(order => order.orderId === id)

    if (index === -1) {
        return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    orders.splice(index, 1)

    return res.status(200).json({
        message: 'Pedido removido com sucesso'
    })
})

