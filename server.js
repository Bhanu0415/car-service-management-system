const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: "name.mysql.database.azure.com",
    user: "adminsql",
    password: "project@123",
    database: "car",
    port: 3306,
    ssl: {
        rejectUnauthorized: true
    }
};

// Function to create database connection
const createDBConnection = async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to MySQL database");
        return connection;
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);  // Exit if DB connection fails
    }
};


app.post("/signup", async (req, res) => {
    const {
        Fname, Lname, username, password, email,
        phone_number, street_no, street_name,
        building_name, city, state, pincode, role
    } = req.body;

    if (!["Customer", "Mechanic"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    const db = await createDBConnection();

    try {
        // Check if email or username already exists
        const [existingUsers] = await db.execute(
            "SELECT email, username FROM users WHERE email = ? OR username = ?",
            [email, username]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Email or username already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into `users` table (let the DB auto-generate the user_id)
        const [userResult] = await db.execute(
            `INSERT INTO users (Fname, Lname, username, password, email, 
                phone_number, street_no, street_name, building_name, 
                city, state, pincode, role) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                Fname, Lname, username, hashedPassword, email,
                ("+91"+phone_number), 
                street_no || null, 
                street_name || null,
                building_name || null, 
                city || null, 
                state || null, 
                pincode || null, 
                role
            ]
        );

        // Get the inserted user's ID
        const userId = userResult.insertId;

        res.status(201).json({ message: "User registered", user_id: userId, role });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database error" });
    } finally {
        db.end();
    }
});

// Signup - Step 2 for Mechanics
app.post("/signup/mechanic", async (req, res) => {
    const {specialization} = req.body;
    console.log(specialization);

    if (!specialization) {
        return res.status(400).json({ 
            msg: "All fields are required" 
        });
    }

    const db = await createDBConnection();

    try {
        const [lastUser] = await db.execute(
            "SELECT user_id, role FROM users ORDER BY user_id DESC LIMIT 1"
        );
        
        const user_id = lastUser[0].user_id;

        // Check if lawyer already exists with this user_id
        const [existingMechanic] = await db.execute(
            "SELECT mechanic_id FROM mechanics WHERE mechanic_id = ?",
            [user_id]
        );
        
        if (existingMechanic.length > 0) {
            return res.status(400).json({ message: "Mechanic profile already exists" });
        }

        // Check if user exists and has lawyer role
        const [userCheck] = await db.execute(
            "SELECT role FROM users WHERE user_id = ?",
            [user_id]
        );
        
        if (userCheck.length === 0) {
            return res.status(404).json({ 
                msg: "User not found" 
            });
        }
        
        if (userCheck[0].role !== "Mechanic") {
            return res.status(400).json({ 
                msg: "User is not registered as a Mechanic" 
            });
        }

        await db.execute(
            `INSERT INTO Mechanics (mechanic_id, specialization) 
             VALUES (?, ?)`,
            [user_id, specialization]
        );

        res.status(201).json({ 
            msg: "Mechanic profile completed successfully!" 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ 
            msg: "Database error" 
        });
    } finally {
        db.end();
    }
});


app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    const db = await createDBConnection();
    try {
        const [results] = await db.execute("SELECT * FROM users WHERE username = ?", [username]);

        if (results.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }

        res.status(200).json({ message: "Login successful", user_id: user.user_id, role: user.role });

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        db.end();
    }
});


app.listen(3000, ()=>{
    console.log("Server running on port 3000");
})