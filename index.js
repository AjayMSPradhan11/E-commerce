var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

var app = express();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Ecommerce',
    password: '',
    port: 5432 
  });

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret:"secret"}));

function isProductInCart(cart,id){
    for(let i=0; i<cart.length; i++){
        if(cart[i].id == id){
            return true;
        }
    }
    return false;
}

function calculateTotal(cart,req){
    total = 0;
    for(let i=0; i<cart.length; i++){
        if(cart[i].sale_price){
            total = total + (cart[i].sale_price*cart[i].quantity);
        }else{
            total = total + (cart[i].price*cart[i].quantity);
        }
    }
    req.session.total = total;
    return total;
}

app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "Products"');
        res.render('pages/index', { result: result.rows });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).send('Error fetching data from database');
    }
});

// Start the server
const PORT = process.env.PORT || 8100;
app.listen(PORT, (error) => {
    if (error) {
        console.error('Error starting server:', error);
    } else {
        console.log(`Server is running on port ${PORT}`);
    }
});

app.get('/', function(req,res){
    res.render('pages/index');
});

app.post('/add_to_cart',function(req,res){
    var id = req.body.id;
    var name = req.body.name;
    var price = req.body.price;
    var sale_price = req.body.sale_price;
    var quantity = req.body.quantity;
    var image = req.body.image;
    var product = {id: id, name: name, price: price, sale_price: sale_price, quantity: quantity, image: image};

    if(req.session.cart){
        var cart = req.session.cart;
        if(!isProductInCart(cart, id)){
            cart.push(product);
        }
    }else{
        req.session.cart = [product];
        var cart = req.session.cart;
    }

    calculateTotal(cart,req);
    res.redirect('/cart');
});

app.get('/cart', function(req, res) {
    var cart = req.session.cart;
    var total = req.session.total;
    res.render('pages/cart', { cart: cart, total: total }); 
});


app.post('/remove_product',function(req,res){
    var id = req.body.id;
    var cart = req.session.cart;

    for(let i=0; i<cart.length; i++){
        if(cart[i].id == id){
            cart.splice(cart.indexOf(i),1);
        }
    }

    calculateTotal(cart,req);
    res.redirect('/cart');
});

app.post('/edit_product_quantity', function(req,res){
    var id = req.body.id;
    var quantity = req.body.quantity;
    var increase_btn = req.body.increase_product_quantity;
    var decrease_btn = req.body.decrease_product_quantity;

    var cart = req.session.cart;

    if(increase_btn){
        for(let i=0; i<cart?.length; i++){
            if(cart[i].id == id){
                if(cart[i].quantity > 0){
                    cart[i].quantity = parseInt(cart[i].quantity)+1;
                }
            }
        }
    }

    if(decrease_btn){
        for(let i=0; i<cart?.length; i++){
            if(cart[i].id == id){
                if(cart[i].quantity > 1){
                    cart[i].quantity = parseInt(cart[i].quantity)-1;
                }
            }
        }
    }

    calculateTotal(cart,req);
    res.redirect('cart');
});

app.get('/checkout',function(req,res){
    res.render('pages/checkout',);
});

app.post('/place_order', function(req, res) {
    var name = req.body.name;
    var email = req.body.email;
    var phone = req.body.phone;
    var city = req.body.city;
    var address = req.body.address;
    var cost = req.session.total;
    var status = "paid";
    var currentDate = new Date().toISOString(); // PostgreSQL requires ISO 8601 format for date

    pool.connect((err, client, done) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        }

        const query = 'INSERT INTO "Orders" (cost, name, email, status, city, address, phone, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
        const values = [cost, name, email, status, city, address, phone, currentDate];

        client.query(query, values, (err, result) => {
            done();

            if (err) {
                console.error('Error executing query', err.stack);
                return res.status(500).send('Error executing query');
            }

            res.redirect('/payment');
        });
    });
});


app.get('/place_holder',function(req,res){
    res.render('pages/payment');
});

app.post('/place_holder', function(req, res) {
    res.send('Form submitted successfully');
});

app.listen(3000, function() {
    console.log('Server is running on port 3000');
});

app.get('/payment',function(req,res){
    res.render('pages/payment');
});
