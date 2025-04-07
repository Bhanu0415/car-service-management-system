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

        res.status(200).json({ 
            message: "Login successful", 
            user_id: user.user_id, 
            role: user.role,
            Fname: user.Fname,
            Lname: user.Lname
        });

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        db.end();
    }
});

// Add this to serverb.js
app.get("/services", async (req, res) => {
    const db = await createDBConnection();
    
    try {
        const [services] = await db.execute(
            "SELECT service_id, service_name, price, description FROM Services"
        );
        res.status(200).json(services);
    } catch (error) {
        console.error("Failed to fetch services:", error);
        res.status(500).json({ error: "Failed to fetch services" });
    } finally {
        db.end();
    }
});

app.get("/users/:user_id", async (req, res)=>{
    const user_id = req.params.user_id;
    const db = await createDBConnection();
    try{
        const [user] = await db.execute(
            "SELECT * FROM users WHERE user_id = ?",
            [user_id]
        );
        if(user.length === 0){
            res.status(403).json({
                message: "User doesn't exist"
            })
        }
        else{
            res.json(user);
        }
    }catch(err){
        console.error("error while getting user's data", err);
        res.status(403).json(err);
    }

})


// ----------------- BOOKINGS ENDPOINTS (Perfectly matched to your schema and form) ----------------- //

app.post("/bookings", async (req, res) => {
    const {
        user_id,
        reg_no,
        car_brand,
        car_model,
        registration_year,
        service_type,
        service_date,
        time_slot,
        pickup_option = "no", // Default value
        special_request = null // Default null
    } = req.body;

    // Validate required fields
    const requiredFields = [
        'user_id', 'reg_no', 'car_brand', 'car_model', 
        'registration_year', 'service_type', 'service_date', 'time_slot'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
        return res.status(400).json({
            error: "Missing required fields",
            missing_fields: missingFields,
            message: `Please provide: ${missingFields.join(', ')}`
        });
    }

    const db = await createDBConnection();

    try {
        // 1. Validate user exists and is a customer
        const [user] = await db.execute(
            "SELECT user_id FROM users WHERE user_id = ? AND role = 'Customer'",
            [user_id]
        );
        
        if (user.length === 0) {
            return res.status(403).json({ error: "Invalid customer ID" });
        }

        // 2. Check if vehicle exists or register new one
        const [vehicle] = await db.execute(
            "SELECT reg_no FROM Vehicles WHERE reg_no = ? AND customer_id = ?",
            [reg_no, user_id]
        );
        
        if (vehicle.length === 0) {
            await db.execute(
                `INSERT INTO Vehicles (reg_no, customer_id, brand, model, reg_year, variant)
                 VALUES (?, ?, ?, ?, ?, 'Petrol')`,
                [reg_no, user_id, car_brand, car_model, registration_year]
            );
        }

        // 3. Check for duplicate bookings
        const [existing] = await db.execute(
            `SELECT booking_id FROM Bookings 
             WHERE customer_id = ? 
             AND reg_no = ? 
             AND service_date = ? 
             AND time_slot = ? 
             AND status IN ('Pending', 'In Progress')`,
            [user_id, reg_no, service_date, time_slot]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                error: "Time slot already booked",
                existing_booking_id: existing[0].booking_id
            });
        }

        // 4. Get service_id
        // const [service] = await db.execute(
        //     "SELECT service_id FROM Services WHERE service_name = ?",
        //     [service_type]
        // );
        
        // if (service.length === 0) {
        //     const [allServices] = await db.execute("SELECT service_name FROM Services");
        //     return res.status(400).json({ 
        //         error: "Invalid service type",
        //         provided_service: service_type,
        //         valid_services: allServices.map(s => s.service_name)
        //     });
        // }

        // const service_id = service[0].service_id;

        // 5. Convert pickup_option to boolean
        const pickup_service = pickup_option === "yes" ? 1 : 0;

        // 6. Insert booking with null checks
        const [result] = await db.execute(
            `INSERT INTO Bookings (
                customer_id, reg_no, service_id,
                service_date, time_slot, pickup_option, 
                special_request, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
            [
                user_id,
                reg_no,
                service_type,
                service_date,
                time_slot,
                pickup_service,
                special_request || null // Ensure null instead of undefined
            ]
        );

        // 7. Get full booking details for response
        const [newBooking] = await db.execute(
            `SELECT 
                b.booking_id, b.service_date, b.time_slot, b.status,
                b.pickup_option, v.brand AS vehicle_brand, 
                v.model AS vehicle_model, s.service_name, s.price
             FROM Bookings b
             JOIN Vehicles v ON b.reg_no = v.reg_no
             JOIN Services s ON b.service_id = s.service_id
             WHERE b.booking_id = ?`,
            [result.insertId]
        );

        res.status(201).json(newBooking[0]);

    } catch (error) {
        console.error("Booking creation failed:", error);
        res.status(500).json({ 
            error: "Failed to create booking",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        db.end();
    }
});





// 2. Get Customer Bookings with Full Details
app.get("/bookings/customer/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const db = await createDBConnection();

    try {
        const [bookings] = await db.execute(
            `SELECT 
                b.booking_id, 
                DATE_FORMAT(b.service_date, '%Y-%m-%d') AS service_date,
                b.time_slot, 
                b.status,
                b.pickup_option,
                b.special_request,
                v.brand AS vehicle_brand, 
                v.model AS vehicle_model,
                v.reg_no,
                v.reg_year,
                s.service_name, 
                s.price,
                s.description AS service_description,
                IFNULL(CONCAT(u.Fname, ' ', u.Lname), 'Not Assigned') AS mechanic_name
             FROM Bookings b
             JOIN Vehicles v ON b.reg_no = v.reg_no
             JOIN Services s ON b.service_id = s.service_id
             LEFT JOIN users u ON b.mechanic_id = u.user_id
             WHERE b.customer_id = ?
             ORDER BY b.service_date DESC, b.time_slot ASC`,
            [user_id]
        );

        // Convert pickup_option to yes/no for frontend
        const formattedBookings = bookings.map(booking => ({
            ...booking,
            pickup_option: booking.pickup_option ? "yes" : "no"
        }));

        res.status(200).json(formattedBookings);
    } catch (error) {
        console.error("Failed to fetch bookings:", error);
        res.status(500).json({ error: "Failed to fetch bookings" });
    } finally {
        db.end();
    }
});

// 3. Get Available Mechanics for a Service Type (modified as requested)
app.get("/mechanics/available", async (req, res) => {
    const { service_type } = req.query;
    const db = await createDBConnection();

    try {
        const [mechanics] = await db.execute(
            `SELECT 
                m.mechanic_id, 
                CONCAT(u.Fname, ' ', u.Lname) AS mechanic_name,
                m.specialization,
                u.phone_number,
                (SELECT COUNT(*) 
                 FROM Bookings b 
                 WHERE b.mechanic_id = m.mechanic_id 
                 AND b.status IN ('Pending', 'In Progress')) AS current_workload
             FROM Mechanics m
             JOIN users u ON m.mechanic_id = u.user_id
             WHERE m.specialization = ?
             HAVING current_workload < 5
             ORDER BY current_workload ASC`,
            [service_type]
        );

        res.status(200).json(mechanics);
    } catch (error) {
        console.error("Failed to fetch mechanics:", error);
        res.status(500).json({ error: "Failed to fetch available mechanics" });
    } finally {
        db.end();
    }
});

// 4. Assign Mechanic to Booking (Admin/System)
app.put("/bookings/:booking_id/assign", async (req, res) => {
    const { booking_id } = req.params;
    const { mechanic_id } = req.body;
    const db = await createDBConnection();

    try {
        // Validate mechanic exists and specializes in this service
        const [mechanic] = await db.execute(
            `SELECT m.mechanic_id 
             FROM Mechanics m
             JOIN Bookings b ON m.specialization = (
                 SELECT s.service_name 
                 FROM Services s 
                 WHERE s.service_id = b.service_id
             )
             WHERE m.mechanic_id = ? AND b.booking_id = ?`,
            [mechanic_id, booking_id]
        );
        
        if (mechanic.length === 0) {
            return res.status(404).json({ error: "Mechanic not available for this service" });
        }

        await db.execute(
            `UPDATE Bookings 
             SET mechanic_id = ?, status = 'In Progress'
             WHERE booking_id = ? AND status = 'Pending'`,
            [mechanic_id, booking_id]
        );

        res.status(200).json({ message: "Mechanic assigned successfully" });
    } catch (error) {
        console.error("Failed to assign mechanic:", error);
        res.status(500).json({ error: "Failed to assign mechanic" });
    } finally {
        db.end();
    }
});

// 5. Update Booking Status
app.put("/bookings/:booking_id/status", async (req, res) => {
    const { booking_id } = req.params;
    const { status } = req.body;
    
    if (!["Pending", "In Progress", "Completed", "Cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    const db = await createDBConnection();

    try {
        await db.execute(
            `UPDATE Bookings 
             SET status = ?
             WHERE booking_id = ?`,
            [status, booking_id]
        );

        res.status(200).json({ message: "Booking status updated" });
    } catch (error) {
        console.error("Failed to update booking:", error);
        res.status(500).json({ error: "Failed to update booking status" });
    } finally {
        db.end();
    }
});

// 6. Get Mechanic's Assigned Bookings with Customer Details
app.get("/bookings/mechanic/:mechanic_id", async (req, res) => {
    const { mechanic_id } = req.params;
    const db = await createDBConnection();

    try {
        const [bookings] = await db.execute(
            `SELECT 
                b.booking_id, 
                DATE_FORMAT(b.service_date, '%Y-%m-%d') AS service_date,
                b.time_slot, 
                b.status,
                b.pickup_option,
                b.special_request,
                v.brand, 
                v.model, 
                v.reg_no,
                v.reg_year,
                s.service_name, 
                s.price,
                CONCAT(u.Fname, ' ', u.Lname) AS customer_name,
                u.phone_number,
                u.street_name,
                u.city
             FROM Bookings b
             JOIN Vehicles v ON b.reg_no = v.reg_no
             JOIN Services s ON b.service_id = s.service_id
             JOIN users u ON b.customer_id = u.user_id
             WHERE b.mechanic_id = ?
             ORDER BY b.service_date ASC, 
             FIELD(b.time_slot, 'Morning', 'Afternoon', 'Evening')`,
            [mechanic_id]
        );

        // Format pickup_option for frontend
        const formattedBookings = bookings.map(booking => ({
            ...booking,
            pickup_option: booking.pickup_option ? "yes" : "no",
            customer_address: `${booking.street_name}, ${booking.city}`
        }));

        res.status(200).json(formattedBookings);
    } catch (error) {
        console.error("Failed to fetch mechanic bookings:", error);
        res.status(500).json({ error: "Failed to fetch bookings" });
    } finally {
        db.end();
    }
});

// Add this to serverb.js before the server starts listening

// Vehicle Management Endpoints
app.post("/vehicles", async (req, res) => {
    const {
        reg_no,
        brand,
        model,
        reg_year,
        customer_id
    } = req.body;

    // Validate required fields
    if (!reg_no || !brand || !model || !reg_year || !customer_id) {
        return res.status(400).json({
            error: "Missing required fields",
            required_fields: ["reg_no", "brand", "model", "reg_year", "customer_id"]
        });
    }

    const db = await createDBConnection();

    try {
        // Check if vehicle already exists
        const [existing] = await db.execute(
            "SELECT reg_no FROM Vehicles WHERE reg_no = ? AND customer_id = ?",
            [reg_no, customer_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                error: "Vehicle already exists",
                reg_no: reg_no,
                customer_id: customer_id
            });
        }

        // Insert new vehicle
        const [result] = await db.execute(
            `INSERT INTO Vehicles (reg_no, customer_id, brand, model, reg_year, variant)
             VALUES (?, ?, ?, ?, ?, 'Petrol')`,
            [reg_no, customer_id, brand, model, reg_year]
        );

        res.status(201).json({
            message: "Vehicle added successfully",
            vehicle_id: result.insertId
        });

    } catch (error) {
        console.error("Vehicle creation failed:", error);
        res.status(500).json({ 
            error: "Failed to save vehicle",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        db.end();
    }
});

// Get user's vehicles
app.get("/vehicles", async (req, res) => {
    const { customer_id } = req.query;
    
    if (!customer_id) {
        return res.status(400).json({ error: "customer_id query parameter is required" });
    }

    const db = await createDBConnection();

    try {
        const [vehicles] = await db.execute(
            "SELECT * FROM Vehicles WHERE customer_id = ?",
            [customer_id]
        );

        res.status(200).json(vehicles);
    } catch (error) {
        console.error("Failed to fetch vehicles:", error);
        res.status(500).json({ error: "Failed to fetch vehicles" });
    } finally {
        db.end();
    }
});

// Delete vehicle
app.delete("/vehicles/:reg_no", async (req, res) => {
    const { reg_no } = req.params;
    const { customer_id } = req.body;

    if (!customer_id) {
        return res.status(400).json({ error: "customer_id is required in request body" });
    }

    const db = await createDBConnection();

    try {
        // Check if vehicle exists and belongs to customer
        const [vehicle] = await db.execute(
            "SELECT reg_no FROM Vehicles WHERE reg_no = ? AND customer_id = ?",
            [reg_no, customer_id]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ error: "Vehicle not found or doesn't belong to customer" });
        }

        // Check if vehicle has active bookings
        const [bookings] = await db.execute(
            "SELECT booking_id FROM Bookings WHERE reg_no = ? AND status IN ('Pending', 'In Progress')",
            [reg_no]
        );

        if (bookings.length > 0) {
            return res.status(400).json({
                error: "Cannot delete vehicle with active bookings",
                active_bookings: bookings.length
            });
        }

        await db.execute(
            "DELETE FROM Vehicles WHERE reg_no = ?",
            [reg_no]
        );

        res.status(200).json({
            message: "Vehicle deleted successfully",
            reg_no: reg_no
        });
    } catch (error) {
        console.error("Failed to delete vehicle:", error);
        res.status(500).json({ error: "Failed to delete vehicle" });
    } finally {
        db.end();
    }
});

app.delete("/bookings/:booking_id", async (req, res) => {
    const { booking_id } = req.params;
    const { user_id, role } = req.body; // Get both user_id and role from auth middleware

    const db = await createDBConnection();
    
    try {
        // 1. Get booking details including customer_id
        const [booking] = await db.execute(
            `SELECT customer_id, status FROM Bookings WHERE booking_id = ?`,
            [booking_id]
        );

        if (booking.length === 0) {
            return res.status(404).json({ error: "Booking not found" });
        }

        // 2. Authorization Check
        const isOwner = booking[0].customer_id == user_id;
        const isAdmin = role === 'Admin';
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: "Unauthorized - you can only cancel your own bookings",
                required_role: "Customer (owner) or Admin",
                your_role: role || "Unknown",
                solution: isAdmin ? 
                    "Ensure your admin token is valid" :
                    "You can only cancel your own bookings"
            });
        }

        // 3. Status Validation
        if (booking[0].status === 'Cancelled') {
            return res.status(400).json({
                error: "Booking already cancelled",
                booking_id: booking_id,
                cancelled_at: booking[0].cancelled_at
            });
        }

        // 4. Perform Cancellation
        await db.execute(
            `UPDATE Bookings 
             SET status = 'Cancelled', 
                 cancelled_at = NOW() 
             WHERE booking_id = ?`,
            [booking_id]
        );

        // 5. Return success response
        res.json({
            success: true,
            booking_id: booking_id,
            cancelled_by: isAdmin ? "Admin" : "Customer",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Cancellation error:", error);
        res.status(500).json({ 
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : null
        });
    } finally {
        db.end();
    }
});

// GET all bookings of a mechanic
// router.get('/bookings/mechanic/:id', async (req, res) => {
//     const mechanicId = req.params.id;
  
//     try {
//       const [rows] = await pool.query(`
//         SELECT 
//           b.booking_id,
//           b.reg_no,
//           v.brand,
//           v.model,
//           u.Fname AS customer_fname,
//           u.Lname AS customer_lname,
//           s.service_name,
//           b.service_date,
//           b.time_slot,
//           b.status
//         FROM Bookings b
//         JOIN Vehicles v ON b.reg_no = v.reg_no
//         JOIN Users u ON b.customer_id = u.user_id
//         JOIN Services s ON b.service_id = s.service_id
//         WHERE b.mechanic_id = ?
//         ORDER BY b.service_date DESC;
//       `, [mechanicId]);
  
//       res.status(200).json({ bookings: rows });
//     } catch (err) {
//       console.error('Error fetching mechanic bookings:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   });


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});