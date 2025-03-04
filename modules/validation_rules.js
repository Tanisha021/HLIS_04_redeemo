const checkValidatorRules = {

    login: {
        email_id: 'required|email',
        login_type: 'required|in:S,G,F,A',
        // Passwords should only be required for standard login
        passwords: 'required_if:login_type,S',
        // Social ID should only be required for social logins
        social_id: 'required_if:login_type,G,F,A'
    },
    signup: {
        email_id: 'required|email',
        // passwords: 'required|min:8',
        // phone_number: 'required|string|min:10|regex:/^[0-9]+$/',
    },
    forgotPassword:{
        email_id: "required|email"
    },
    addProfilePic:{
        user_id: "required",
        profile_pic: "required"
    },
    verifyOTP: {
        email_id: 'required',
        otp: 'required'
    },
    resetPassword:{
        email_id: "required|email",
        passwords: "required|min:8"
    },
    changePassword:{
        user_id: "required",
        old_password: "required|min:8",
        new_password: "required|min:8"
    },
    compeleteUserProfile:{
        fname:"required",
        lname:"required",
        address:"required",
        dob:"required",
        gender:"required"
    },
    create_post:{
        descriptions: "required",
        title: "required",
        category_name: "required",
        user_id: "required"
    },
    

};

module.exports = checkValidatorRules;

