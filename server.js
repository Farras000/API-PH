const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const mqtt = require('mqtt'); 
const moment = require('moment'); 
const app = express();

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/sensorApp')
    .then(() => console.log("Database connected"))
    .catch(err => console.error(err));

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
});

const sensorSchema = new mongoose.Schema({
    user_id: String,
    sensor_value: Number,
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Sensor = mongoose.model('Sensor', sensorSchema);

// === MQTT SETUP ===
const mqttClient = mqtt.connect('mqtt://test.mosquitto.org');

mqttClient.on('connect', () => {
    console.log('MQTT connected');
    mqttClient.subscribe('sensors/#');
});

mqttClient.on('message', async (topic, message) => {
    console.log('Received MQTT message on topic:', topic);
    console.log('Message:', message.toString());
    
    try {
        const [_, userId, sensorType] = topic.split('/');
        const sensorValue = JSON.parse(message.toString()).ph_value;

        const newSensorData = new Sensor({
            user_id: userId,
            sensor_value: sensorValue
        });

        await newSensorData.save();
        console.log('Sensor data saved:', newSensorData);
    } catch (err) {
        console.error('Error processing MQTT message:', err);
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        
        res.json({ message: 'Pengguna berhasil terdaftar' });
    } catch (err) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

app.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    const user = await User.findOne({ 
        $or: [{ username: identifier }, { email: identifier }] 
    });
    
    if (!user) return res.status(400).json({ message: 'User Tidak Ditemukan' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Kredensial tidak valid' });
    
    const token = jwt.sign({ userId: user._id }, 'secretkey', { expiresIn: '1h' });
    res.json({ token });
});

app.get('/sensors', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Token tidak disediakan' });

    try {
        const decoded = jwt.verify(token, 'secretkey');
        const user = await User.findById(decoded.userId);
        
        if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        
        const sensors = await Sensor.find({ user_id: user._id });
        res.json(sensors);
    } catch (err) {
        return res.status(403).json({ message: 'Token tidak valid' });
    }
});

app.post('/add-sensor-data', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ message: 'Token tidak disediakan' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'Token tidak valid' });
    }

    try {
        const decoded = jwt.verify(token, 'secretkey');
        const { sensor_value } = req.body;
        const newSensorData = new Sensor({
            user_id: decoded.userId,
            sensor_value
        });

        await newSensorData.save();
        res.json({ message: 'Data sensor berhasil ditambahkan' });
    } catch (err) {
        return res.status(403).json({ message: 'Token tidak valid atau terjadi kesalahan' });
    }
});


app.get('/7days', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Token tidak disediakan' });

    try {
        const decoded = jwt.verify(token, 'secretkey');
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        const sevenDaysAgo = moment().subtract(7, 'days').startOf('day').toDate();
        const sensors = await Sensor.find({
            user_id: user._id,
            created_at: { $gte: sevenDaysAgo }
        }).sort({ created_at: 1 });
        
        res.json(sensors);
    } catch (err) {
        console.error(err);
        return res.status(403).json({ message: 'Token tidak valid atau terjadi kesalahan' });
    }
});

// Menjalankan server
app.listen(3000, () => {
    console.log('Server berjalan di port 3000');
});
