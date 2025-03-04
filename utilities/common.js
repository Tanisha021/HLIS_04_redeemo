const database = require("../config/database");
const {default: localizify} = require('localizify');
const { t } = require('localizify');
class common{
    generateOTP(){
        return Math.floor(1000 + Math.random() * 9000);
    }
    generateToken(length){
        if(length <= 0){
            throw new Error("Token length must be greater than 0");
        }
        const alphaNumeric = '0123456789qwertyuiopasdfghjklzxcvbnm';
        let token = '';
        for (let i = 0; i < length; i++) {
            token += alphaNumeric[Math.floor(Math.random() * alphaNumeric.length)];
        }
        return token;
    }
    response(res, message){
        // res.status(statusCode);
       return res.json(message);
    }

    async getUserDetail(user_id, callback) {
        const selectUserQuery = "SELECT * FROM tbl_user WHERE user_id = ?";
        
        try {
            const [user] = await database.query(selectUserQuery, [user_id]);
                    console.log(user);
                    
            if (user.length > 0) {
                callback(null, user[0]); 
            } else {
                callback("User not found", null); 
            }
        } catch (error) {
            callback(error.message, null); 
        }
    }
    
    async updateUserInfo(user_id, user_data) {
        const updateQuery = "UPDATE tbl_user SET ? WHERE user_id = ?";
        
        try {
            console.log("User Data to Update:", user_data);
            console.log("Executing Query:", updateQuery, [user_data, user_id]);
    
            const [result] = await database.query(updateQuery, [user_data, user_id]);
    
            console.log("Update Result:", result);
    
            if (result.affectedRows === 0) {
                console.warn("No rows updated - Either user not found or no changes made");
                return null;
            }
    
            const selectUserQuery = `
                SELECT user_id, user_name, lname, fname, address, dob, gender, isstep_
                FROM tbl_user 
                WHERE user_id = ?
            `;
    
            const [updatedUser] = await database.query(selectUserQuery, [user_id]);
    
            console.log("Updated User Data from DB:", updatedUser);
    
            return updatedUser.length > 0 ? updatedUser[0] : null;
    
        } catch (error) {
            console.error("Error in updateUserInfo:", error);
            throw error;
        }
    }
    
    
    async getUserDetailLogin(user_id, login_type, callback) {
        console.log("User ID:", user_id);
        console.log("Login Type:", login_type);
        
        // Modified to get user details directly from tbl_user without joining tbl_socials
        const selectUserQuery = "SELECT * FROM tbl_user WHERE user_id = ?";
        
        try {
            const [user] = await database.query(selectUserQuery, [user_id]);
            console.log("User", user);
            
            if (user.length > 0) {
                // Return the user object directly
                return callback(undefined, user[0]);
            } else {
                return callback(t('no_data_found'), []);
            }
        } catch (error) {
            console.error("Error in getUserDetailLogin:", error);
            return callback(error.message || error, []);
        }
    }
    // encrypt(data){
    //     return cryptolib.encrypt(JSON.stringify(data));
    // }
}
module.exports = new common;