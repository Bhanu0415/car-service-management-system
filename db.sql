use car;
select * from users;
select * from vehicles;
select * from mechanics;
select * from services;
select * from bookings;
-- Customers Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    Fname VARCHAR(30) NOT NULL,
    Lname VARCHAR(30) NOT NULL,
    username VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(60) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    street_no VARCHAR(5),
    street_name VARCHAR(50),
    building_name VARCHAR(50),
    city VARCHAR(30),
    state VARCHAR(30),
    pincode VARCHAR(10),
    role ENUM('Customer', 'Mechanic') NOT NULL
);

-- Vehicles Table of Customers
CREATE TABLE Vehicles (
    reg_no VARCHAR(10) PRIMARY KEY,
    customer_id INT,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    reg_year VARCHAR(4) NOT NULL,
    variant ENUM('Petrol', 'Diesel', 'Electric') NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Mechanics Table
CREATE TABLE Mechanics (
    mechanic_id INT PRIMARY KEY,
    specialization ENUM('Oil Change', 'Tire Rotation', 'Major Repair') NOT NULL,
    FOREIGN KEY (mechanic_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Services Table
CREATE TABLE Services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name ENUM('Oil Change', 'Tire Rotation', 'Major Repair') NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL
);

-- Bookings Table
CREATE TABLE Bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    reg_no VARCHAR(10),
    service_id INT,
    mechanic_id INT,
    service_date DATE NOT NULL,
    time_slot ENUM('Morning', 'Afternoon', 'Evening') NOT NULL,
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending',
    special_request TEXT,
    FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reg_no) REFERENCES Vehicles(reg_no) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE,
    FOREIGN KEY (mechanic_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Insert services
INSERT INTO Services (service_name, description, price) VALUES
('Oil Change', 'Standard oil change with filter replacement', 1499.00),
('Tire Rotation', 'Rotation of all four tires for even wear', 899.00),
('Major Repair', 'Diagnostic and repair of major mechanical issues', 4999.00);

-- Insert customers (20 customers with Indian names)
INSERT INTO users (Fname, Lname, username, password, phone_number, email, street_no, street_name, city, state, pincode, role) VALUES
('Rahul', 'Sharma', 'rahulsh', 'hashedpass1', '+919876543210', 'rahul.sharma@email.com', '12', 'MG Road', 'Mumbai', 'Maharashtra', '400001', 'Customer'),
('Priya', 'Patel', 'priyap', 'hashedpass2', '+919876543211', 'priya.patel@email.com', '34', 'Brigade Road', 'Bangalore', 'Karnataka', '560001', 'Customer'),
('Aarav', 'Singh', 'aaravs', 'hashedpass3', '+919876543212', 'aarav.singh@email.com', '56', 'Park Street', 'Kolkata', 'West Bengal', '700016', 'Customer'),
('Ananya', 'Gupta', 'ananyag', 'hashedpass4', '+919876543213', 'ananya.gupta@email.com', '78', 'Connaught Place', 'Delhi', 'Delhi', '110001', 'Customer');

-- Insert mechanics (15 mechanics with Indian names)
INSERT INTO users (Fname, Lname, username, password, phone_number, email, street_no, street_name, city, state, pincode, role) VALUES
('Rajesh', 'Yadav', 'rajeshym', 'mechpass1', '+919876543225', 'rajesh.yadav@email.com', '77', 'Marine Lines', 'Mumbai', 'Maharashtra', '400002', 'Mechanic'),
('Suresh', 'Khan', 'sureshkm', 'mechpass2', '+919876543226', 'suresh.khan@email.com', '88', 'Frazer Town', 'Bangalore', 'Karnataka', '560005', 'Mechanic'),
('Vijay', 'Naidu', 'vijaynm', 'mechpass3', '+919876543227', 'vijay.naidu@email.com', '99', 'Rash Behari Ave', 'Kolkata', 'West Bengal', '700029', 'Mechanic'),
('Harish', 'Pillai', 'harishpm', 'mechpass4', '+919876543228', 'harish.pillai@email.com', '10', 'Lajpat Nagar', 'Delhi', 'Delhi', '110024', 'Mechanic');

-- Insert mechanic specializations
INSERT INTO Mechanics (mechanic_id, specialization) VALUES
(16, 'Oil Change'),
(17, 'Tire Rotation'),
(18, 'Major Repair'),
(19, 'Oil Change');

-- Insert vehicles (at least 20 vehicles)
INSERT INTO Vehicles (reg_no, customer_id, brand, model, reg_year, variant) VALUES
('MH01AB1234', 1, 'Maruti Suzuki', 'Swift', '2018', 'Petrol'),
('KA02CD5678', 2, 'Hyundai', 'Creta', '2020', 'Diesel'),
('WB03EF9012', 3, 'Tata', 'Nexon', '2019', 'Diesel'),
('DL04GH3456', 4, 'Honda', 'City', '2021', 'Petrol'),
('MH01EF2345', 1, 'Hyundai', 'i20', '2019', 'Petrol'),
('KA02GH6789', 2, 'Maruti Suzuki', 'Dzire', '2018', 'Petrol');

-- Insert bookings (40 bookings)
INSERT INTO Bookings (customer_id, reg_no, service_id, mechanic_id, service_date, time_slot, status, special_request) VALUES
(1, 'MH01AB1234', 1, 16, '2023-06-01', 'Morning', 'Completed', 'Please check brakes also'),
(2, 'KA02CD5678', 2, 17, '2023-06-02', 'Afternoon', 'Completed', 'Need nitrogen filling'),
(3, 'WB03EF9012', 3, 18, '2023-06-03', 'Evening', 'Completed', 'Check engine noise'),
(4, 'DL04GH3456', 1, 19, '2023-06-04', 'Morning', 'Completed', 'Synthetic oil only'),
(1, 'MH01EF2345', 1, 16, '2023-06-16', 'Morning', 'In Progress', 'Quick service'),
(2, 'KA02GH6789', 2, 17, '2023-06-17', 'Afternoon', 'In Progress', NULL),
(3, 'WB03IJ0123', 3, 18, '2023-06-18', 'Evening', 'In Progress', 'Urgent repair'),