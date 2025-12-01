import express from 'express'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import pool from './database.js'

/*declarando o express como função*/
const app = express()
/*utilizando JSON*/
app.use(express.json())

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Orders API',
        version: '1.0.0',
        description: 'API para gerenciamento de pedidos'
    },
    servers: [
        { url: 'http://localhost:3000' }
    ]
}

const swaggerOptions = {
    swaggerDefinition,
    apis: ['./server.js']
}

const swaggerSpec = swaggerJSDoc(swaggerOptions)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))


/**
 * @swagger
 * /order:
 *   post:
 *     summary: Criar pedido
 *     description: Cria um novo pedido com seus itens.
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numeroPedido:
 *                 type: string
 *                 example: v10089016vdb
 *               valorTotal:
 *                 type: number
 *                 example: 1000
 *               dataCriacao:
 *                 type: string
 *                 format: date-time
 *                 example: 2023-07-19T12:24:11.529Z
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     idItem:
 *                       type: string
 *                       example: "2434"
 *                     quantidadeItem:
 *                       type: integer
 *                       example: 1
 *                     valorItem:
 *                       type: number
 *                       example: 1000
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso
 *       400:
 *         description: Dados inválidos
 */
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

        //Inserir pedido
        await connection.query(
            `INSERT INTO \`order\` (orderId, value, creationDate)
             VALUES (?,?,?)`,
            [mappedOrder.orderId, mappedOrder.value, mappedOrder.creationDate]
        )

        //Inserir itens
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

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: Buscar pedido por ID
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: v10089016vdb
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *       404:
 *         description: Pedido não encontrado
 */
app.get('/orders/:id', async (req, res) => {
    const { id } = req.params

    try {
        const [order] = await pool.query(
            'SELECT * FROM orders WHERE orderId = ?',
            [id]
        )

        if (order.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' })
        }

        const [items] = await pool.query(
            'SELECT productId, quantity, price FROM items WHERE orderId = ?',
            [id]
        )

        return res.status(200).json({
            ...order[0],
            items
        })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Erro ao buscar pedido' })
    }
})

/**
 * @swagger
 * /order/list:
 *   get:
 *     summary: Listar todos os pedidos
 *     tags:
 *       - Orders
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
// Listando todos os pedidos
app.get('/orders/list', async (req, res) => {
    try {
        const [orders] = await pool.query('SELECT * FROM orders')

        const result = []

        for (const order of orders) {
            const [items] = await pool.query(
                'SELECT productId, quantity, price FROM items WHERE orderId = ?',
                [order.orderId]
            )

            result.push({
                ...order,
                items
            })
        }

        return res.status(200).json(result)

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Erro ao listar pedidos' })
    }
})


/**
 * @swagger
 * /order/{id}:
 *   put:
 *     summary: Atualizar pedido
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Pedido atualizado
 */
// Atualizando um pedido pelo ID
app.put('/orders/:id', async (req, res) => {
    const { id } = req.params
    const { numeroPedido, valorTotal, dataCriacao, items } = req.body

    try {
        const [exists] = await pool.query(
            'SELECT * FROM orders WHERE orderId = ?',
            [id]
        )

        if (exists.length === 0)
            return res.status(404).json({ error: 'Pedido não encontrado' })

        await pool.query(
            'UPDATE orders SET value=?, creationDate=? WHERE orderId=?',
            [valorTotal, new Date(dataCriacao), id]
        )

        await pool.query('DELETE FROM items WHERE orderId=?', [id])

        for (const item of items) {
            await pool.query(
                'INSERT INTO items(orderId, productId, quantity, price) VALUES (?,?,?,?)',
                [id, item.idItem, item.quantidadeItem, item.valorItem]
            )
        }

        return res.status(200).json({ message: 'Pedido atualizado com sucesso' })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Erro ao atualizar pedido' })
    }
})

/**
 * @swagger
 * /order/{id}:
 *   delete:
 *     summary: Deletar pedido
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Pedido removido
 */
// Deletando um pedido pelo ID
app.delete('/orders/:id', async (req, res) => {
    const { id } = req.params

    try {
        const [exists] = await pool.query(
            'SELECT * FROM orders WHERE orderId = ?',
            [id]
        )

        if (exists.length === 0)
            return res.status(404).json({ error: 'Pedido não encontrado' })

        await pool.query('DELETE FROM orders WHERE orderId=?', [id])

        return res.status(200).json({ message: 'Pedido removido com sucesso' })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Erro ao deletar pedido' })
    }
})

