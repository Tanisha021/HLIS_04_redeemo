const User = require('../controller/user');  

const customerRoute = (app) => {
    //authentication
    app.post("/v1/user/signup", User.signup); 
    app.post("/v1/user/login", User.login);
    app.post("/v1/user/generate-otp", User.verifyOTP);
    app.post("/v1/user/verify-otp", User.validateOTP);
    app.post("/v1/user/resend-otp", User.resendOTP);
    app.get("/v1/user/check-verification", User.checkUserVerification);
    app.post("/v1/user/complete-profile", User.compeleteUserProfile);
    app.post("/v1/user/forgot-password", User.forgotPassword);
    app.post("/v1/user/reset-password", User.resetPassword);
    app.post("/v1/user/change-password", User.changePassword);

    //figma apis
    app.post("/v1/user/category-listing", User.categoryListing); 
    app.post("/v1/user/trending-service-providers", User.displaySeriveProviders); 
    app.post("/v1/user/service-listings", User.serviceListings); 
    app.post("/v1/user/service-provider-details/:sp_id", User.serviceProviderDetails); 
    app.post("/v1/user/redeem-voucher", User.redeemVoucher);
    app.post("/v1/user/list-user-fav", User.listUserFav);
    app.post("/v1/user/notification", User.notifications);
    app.post("/v1/user/post-review-rating", User.post_review_rating);
    app.post("/v1/user/logout", User.logout);
    app.post("/v1/user/delete", User.delete);

};

module.exports = customerRoute;



