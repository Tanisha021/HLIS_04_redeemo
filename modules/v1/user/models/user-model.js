const common = require("../../../../utilities/common");
const database = require("../../../../config/database");
const response_code = require("../../../../utilities/response-error-code");
const md5 = require("md5");
const {default: localizify} = require('localizify');
const { t } = require("localizify");


class UserModel {


    async categoryListing(request_data,callback){
        try{
            const selectCategoryQuery=`SELECT c.category_id, c.category_name, i.image_name
                                FROM tbl_categories c inner join tbl_images i on c.image_id = i.image_id
                                WHERE c.is_active = 1 AND c.is_deleted = 0`

            const [categories] = await database.query(selectCategoryQuery);
            console.log(categories);
            if(categories.length > 0){
                return callback({
                    code: response_code.SUCCESS,
                    message: "Categories",
                    data: categories
                });
            }
        }catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: t('some_error_occurred') + (error.sqlMessage || error.message),
                data: error
            })
        }
    }
    
    async displaySeriveProviders(request_data, callback) {
        try{
            const updateTrendingQuery = `
                    UPDATE tbl_service_provider sp
                    JOIN (
                        SELECT sp_id
                        FROM (
                            SELECT sp_id, AVG(rating) AS avg_rating
                            FROM tbl_ratings_review
                            GROUP BY sp_id
                            ORDER BY COUNT(rating_review_id) DESC, avg_rating DESC
                            LIMIT 3
                        ) AS trending_sp
                    ) tsp ON sp.sp_id = tsp.sp_id
                    SET sp.is_trending = 1
                    WHERE is_active = 1 AND is_deleted = 0 `;
    
            await database.query(updateTrendingQuery);
            const resetTrendingQuery = `
                            UPDATE tbl_service_provider SET is_trending = 0 
                            WHERE sp_id NOT IN (
                            SELECT sp_id FROM (
                                SELECT sp_id
                                FROM tbl_ratings_review
                                GROUP BY sp_id
                                ORDER BY COUNT(rating_review_id) DESC, AVG(rating) DESC
                                LIMIT 3
                            ) AS trending
                    ) `;

            await database.query(resetTrendingQuery);

            const selectQuery =`SELECT sp.sp_id, i.image_name 
                                    FROM tbl_service_provider sp
                                    INNER JOIN tbl_images i ON i.image_id = sp.cover_image_id
                                    WHERE sp.is_trending = 1 AND sp.is_active = 1 AND sp.is_deleted = 0`
            const [result] = await database.query(selectQuery);
            if(result.length > 0){
                return callback({
                    code: response_code.SUCCESS,
                    message: "Trending service providers",
                    data: result
                });
                                
        }else {
            return callback({
                code: response_code.NO_DATA_FOUND,  // Assuming a code for empty data
                message: "No trending service providers found",
                data: []
            });
        }
        
    }catch(error){
        console.error("Database Error:", error);
        return callback({
            code: response_code.OPERATION_FAILED,
            message: "Database error occurred: " + (error.sqlMessage || error.message)
        });
    }

    }   

    // async serviceProviderDetails(request_data, callback) {
        
    //     try{
    //         const selectQuery =`SELECT 
    //                                                     sp.title_name,
    //                                                     sp.sp_id,
    //                                                     sp.avg_rating,
    //                                                     sp.open_close_status,
    //                                                     sc.contact_number,
    //                                                     sc.contact_email,
    //                                                     COUNT(rr.rating_review_id) AS total_reviews,
    //                                                     GROUP_CONCAT(DISTINCT a.amenities_name) AS amenities_provided,
    //                                                     v.voucher_id,
    //                                                     v.title,
    //                                                     v.descriptions,
    //                                                     v.saving_amt,
    //                                                     v.expire_date,
    //                                                     v.descriptions AS voucher_description
    //                                                 FROM tbl_service_provider sp
    //                                                 LEFT JOIN tbl_contact sc ON sp.sp_id = sc.sp_id
    //                                                 LEFT JOIN tbl_ratings_review rr ON sp.sp_id = rr.sp_id
    //                                                 LEFT JOIN tbl_amenities_sp_relation spa ON sp.sp_id = spa.sp_id
    //                                                 LEFT JOIN tbl_amenities a ON spa.amenities_id = a.amenities_id
    //                                                 left join tbl_voucher_sp_relation vsr on vsr.sp_id = sp.sp_id
    //                                                 LEFT JOIN tbl_vouchers v ON vsr.voucher_id = v.voucher_id
    //                                                 WHERE sp.title_name = ?
    //                                                 GROUP BY sp.sp_id, sp.title_name, sp.avg_rating, sp.open_close_status, sc.contact_number, sc.contact_email, 
    //                                                         v.voucher_id, v.title,v.descriptions,v.saving_amt, v.expire_date, v.descriptions;`
    //         const [result] = await database.query(selectQuery, [request_data.title_name]);
    //         if(result.length > 0){
    //             return callback({
    //                 code: response_code.SUCCESS,
    //                 message: "service provider details",
    //                 data: result
    //             });
                                
    //     }else {
    //         return callback({
    //             code: response_code.NO_DATA_FOUND,  
    //             message: `No service provider found with title name: ${request_data.title_name}`,
    //             data: []
    //         });
    //     }

    // }catch(error){
    //     console.error("Database Error:", error);
    //     return callback({
    //         code: response_code.OPERATION_FAILED,
    //         message: "Database error occurred: " + (error.sqlMessage || error.message)
    //     });
    // }
    // }

    async serviceListings(request_data,user_id,user,callback) {
        let page = request_data.page <= 0 ? 1 : request_data.page;

        const limit = 10;
        const start = (page - 1) * limit;

        let featured = "";
        let trending = "";
        let fav = "";
        let category = "";
        let search = "";
        let amenities = "";
        var latitude = user.latitude;
        var longitude = user.longitude;
        var distance_filter = "";
        var nearby = "";

        const updateUserNotTrending=`update tbl_service_provider set is_trending = 0 where sp_id not in 
                                (select sp_id from 
                                (select sp_id , review_cnt, avg_rating from tbl_service_provider 
                                order by avg_rating desc, review_cnt desc limit 3)as trending)`

        await database.query(updateUserNotTrending);

        const updateUserWithTrending = `UPDATE tbl_service_provider sp
                                        LEFT JOIN (
                                            SELECT sp_id 
                                            FROM tbl_service_provider 
                                            ORDER BY avg_rating DESC, review_cnt DESC 
                                            LIMIT 3
                                        ) AS trending ON sp.sp_id = trending.sp_id
                                        SET sp.is_trending = 1
                                        WHERE is_active = 1 and is_deleted = 0;`
         await database.query(updateUserWithTrending);

         const updateUserNotfeatured =`update tbl_service_provider set is_featured = 0 where sp_id not in 
                                (select sp_id from 
                                (select sp_id , review_cnt, avg_rating from tbl_service_provider 
                                order by avg_rating desc limit 3)as featured)`

        await database.query(updateUserNotfeatured);

        const updateUserWithFeature = `update tbl_service_provider sp
                                        left join (
                                            select sp_id 
                                            from tbl_service_provider 
                                            order by avg_rating desc limit 3
                                        ) AS featured on sp.sp_id = featured.sp_id
                                        SET sp.is_featured = 1
                                        WHERE is_active = 1 and is_deleted = 0;`


        await database.query(updateUserWithFeature);

        if(request_data.trending){
            trending = "tbl_service_provider.is_trending = 1 AND "
        }

        if (request_data.featured) {
            featured = "tbl_service_provider.is_featured = 1 AND ";
        }
        if (request_data.fav) {
            fav = 'tbl_service_provider.sp_id IN (SELECT sp_id FROM tbl_user_fav_sp WHERE user_id = ' + user_id + ') AND ';
        }

        if(request_data.category && Array.isArray(request_data.category) && request_data.category.length > 0){
            category = "tbl_service_provider.category_id IN (" + request_data.category.join(",") + ") AND";
        }

        if(request_data.search && request_data.search.trim() !== ''){
            search = `((about_text LIKE '%${request_data.search}%' ) OR (title_name LIKE '%${request_data.search}%')) `;
        }   
        
        if (request_data.amenities && Array.isArray(request_data.amenities) && request_data.amenities.length > 0) {
            amenities = `AND tbl_service_provider.sp_id IN (SELECT sp_id FROM tbl_amenities_sp_relation WHERE amenities_id IN (${request_data.amenities.join(",")})) `;
        } 

        if (latitude && longitude && request_data.distance_km) {
            let max_distance = request_data.distance_km;
        
            distance_filter = `AND
                (6371 * acos(
                    cos(radians(${latitude})) * cos(radians(tbl_service_provider.latitude)) 
                    * cos(radians(tbl_service_provider.longitude) - radians(${longitude})) 
                    + sin(radians(${latitude})) * sin(radians(tbl_service_provider.latitude))
                )) <= ${max_distance} `;
        }

        if (latitude && longitude && request_data.nearby) {
        
            nearby = `AND
                (6371 * acos(
                    cos(radians(${latitude})) * cos(radians(tbl_service_provider.latitude)) 
                    * cos(radians(tbl_service_provider.longitude) - radians(${longitude})) 
                    + sin(radians(${latitude})) * sin(radians(tbl_service_provider.latitude))
                )) <= 500 `;
        }

        let whereConditions = trending + featured + fav + category+search + amenities + distance_filter + nearby;
        whereConditions = whereConditions.trim();

        if(whereConditions.endsWith("AND")){
            whereConditions = whereConditions.slice(0, -4).trim();
        }

        let final_query=`select * from tbl_service_provider where ${whereConditions} and is_active = 1 and is_deleted = 0 limit ${start},${limit}`
        console.log(final_query);

        
        try{
            const [results] = await database.query(final_query);
            return callback({
                code: response_code.SUCCESS,
                data: results
            })
        } catch(error){
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                data: error
            })
        }
    }

    async serviceProviderDetails(request_data,user_id,user,sp_id, callback) {
        try{
            let latitude = user.latitude;
            let longitude = user.longitude;

            const selectQuery = `SELECT 
                                s.sp_id, 
                                s.title_name, 
                                a.address, 
                                s.latitude, 
                                s.longitude, 
                                (6371 * ACOS(
                                    COS(RADIANS(${latitude})) * COS(RADIANS(s.latitude)) 
                                    * COS(RADIANS(s.longitude) - RADIANS(${longitude})) 
                                    + SIN(RADIANS(${latitude})) * SIN(RADIANS(s.latitude))
                                )) AS distance, 
                                s.review_cnt, 
                                cn.contact_number, 
                                cn.contact_email, 
                                l.image_name AS logo_image, 
                                c.image_name AS cover_image
                            FROM tbl_service_provider s 
                            left join tbl_contact cn on cn.sp_id = s.sp_id
                            LEFT JOIN tbl_address a ON a.address_id = s.address_id 
                            LEFT JOIN tbl_images l ON l.image_id = s.logo_img_id 
                            LEFT JOIN tbl_images c ON c.image_id = s.cover_image_id
                            WHERE s.sp_id = ?;`

            const [result] = await database.query(selectQuery, [sp_id]);
            console.log(result);

            if (result.length === 0) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "Service provider not found",
                    data: null
                });
            }

            let additionalData = {}
            if(request_data.about){
                let aboutQuery = `SELECT about_text FROM tbl_service_provider WHERE sp_id = ?;`
                let amenitiesQuery = `SELECT a.amenities_name FROM tbl_amenities_sp_relation as aspr
                                        INNER JOIN tbl_amenities a ON a.amenities_id = aspr.amenities_id
                                        WHERE aspr.sp_id = ? and aspr.is_active =1;`
                let galleryQuery = `SELECT i.image_name FROM tbl_service_provider_gallery as spg
                                    INNER JOIN tbl_images i ON i.image_id = spg.image_id
                                    WHERE spg.sp_id = ? and spg.is_active = 1;`

                const [aboutResult] = await database.query(aboutQuery, [sp_id]);
                const [amenitiesResult] = await database.query(amenitiesQuery, [sp_id]);
                const [galleryResult] = await database.query(galleryQuery, [sp_id]);

                additionalData.about = aboutResult.length>0 ?aboutResult[0].about_text:"";
                additionalData.amenities = amenitiesResult.map(item => item.amenities_name);
                additionalData.gallery = galleryResult.map(item => item.image_name);
                console.log(additionalData);
            }

            if(request_data.vouchers){
                let voucherQuery = `SELECT v.voucher_id, v.title, v.descriptions, v.saving_amt, v.expire_date, i.image_name AS voucher_banner
                                    FROM tbl_voucher_sp_relation as vsr
                                    INNER JOIN tbl_vouchers v ON v.voucher_id = vsr.voucher_id
                                    INNER JOIN tbl_images i ON i.image_id = v.voucher_banner_id
                                    WHERE vsr.sp_id = ? and vsr.is_active = 1;`
                const [voucherResult] = await database.query(voucherQuery, [sp_id]);
                additionalData.vouchers = voucherResult;
            }

            if(request_data.branches){
                let brancheQuery = `SELECT b.branch_id, b.branch_name, b.avg_rating, b.desc_ 
                                        FROM tbl_branch b 
                                        WHERE b.sp_id = ? AND b.is_active = 1;`
                const [branchResult] = await database.query(brancheQuery, [sp_id]);
                additionalData.branches = branchResult;
            }

            if(request_data.rating_review){
                let ratingReviewQuery = `SELECT rr.rating_review_id, rr.rating, rr.reviews, rr.created_at,u.fname, u.lname
                                        FROM tbl_ratings_review rr
                                        INNER JOIN tbl_user u ON u.user_id = rr.user_id
                                        WHERE rr.sp_id = ? AND rr.is_active = 1;`
                const [ratingReviewResult] = await database.query(ratingReviewQuery, [sp_id]);
                additionalData.rating_review = ratingReviewResult;
            }

            return callback({
                code: response_code.SUCCESS,
                data: { ...result[0], ...additionalData }
            });

        }catch (error) {
            console.error(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "SOME ERROR OCCURRED",
                data: error
            });
        }
    }

    async redeemVoucher(request_data,user_id,callback){
        try{
            //see if voucher exists
            const selectQuery = `SELECT voucher_id, saving_amt, expire_date from tbl_vouchers where voucher_id =? and is_active = 1 and is_deleted = 0 `
            const [voucherResult] = await database.query(selectQuery, [request_data.voucher_id]);

            console.log("voucher_id type:", typeof request_data.voucher_id);

            if(!voucherResult.length){
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "Voucher not found or inactive",
                    data: null
                });
            }

            if(voucherResult.expire_date < new Date()){
                return callback({
                    code: response_code.BAD_REQUEST,
                    message: "This voucher has expired",
                    data: null
                })
            }

            const redemptionCheckQuery = `SELECT * FROM tbl_redeem_voucher WHERE user_id = ? AND voucher_id = ?;`;
            const [redemptionCheck] = await database.query(redemptionCheckQuery, [user_id, request_data.voucher_id]);
            if (redemptionCheck.length > 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "You have already redeemed this voucher",
                    data: null
                });
            }

            const insertRedemptionQuery = `insert into tbl_redeem_voucher (user_id,sp_id, voucher_id, status, created_at) values (?,?, ?, 'SUCCESS', NOW());`
            await database.query(insertRedemptionQuery, [user_id, request_data.voucher_id,request_data.sp_id]);
            
            return callback({
                code: response_code.SUCCESS,
                message: "Voucher redeemed successfully!",
                data: {
                    user_id,
                    voucher_id:request_data.voucher_id,
                    saved_amount: voucherResult[0].saving_amt
                }
            });

        }catch(error){
        return callback({
            code: response_code.OPERATION_FAILED,
            message: "SOME ERROR",
            data: error.message
        });
    }
    }

    async listUserFav(request_data,user_id,callback){
        try{
            let query= "";
            if(request_data.sp_fav){
                query = `SELECT * from tbl_service_provider where sp_id in (SELECT sp_id from tbl_user_fav_sp WHERE user_id = ${user_id})`;
            }else if(request_data.voucher_fav){
                query = `SELECT * from tbl_vouchers where voucher_id in (SELECT voucher_id from tbl_user_fav_voucher WHERE user_id = ${user_id})`;
            }else{
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "SOME ERROR OCCURED PLEASE SELECT FAV type"
                })
            }
 
            const [result] = await database.query(query);
            console.log(result);
            if(result.length===0){
                return callback({
                    code: response_code.NO_DATA_FOUND,
                    message: "No data found",
                    data: []
                });
            }
            return callback({
                code: response_code.SUCCESS,
                data: result
            });
        }catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "SOME ERROR OCCURED",
                data: error
            });
        }
    }   

    async notifications(request_data,user_id,callback){
        try{
            const selectQuery = `SELECT * from tbl_notification where user_id = ${user_id}`
            const [result] = await database.query(selectQuery);

            if(result.length === 0){
                return callback({
                    code: response_code.NO_DATA_FOUND,
                    message: "No notifications found",
                    data: []
                });
            }   
            return callback({
                code: response_code.SUCCESS,
                data: result
            })

        }catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "SOME ERROR",
                data: error
            });
        }
    }

    async logout(request_data,callback){
        try{
            const select_user_query = "SELECT * FROM tbl_user WHERE user_id = ? and is_login = 1";
            const [info] = await database.query(select_user_query, [request_data.user_id]);
            if(info.length>0){
                const updatedUserQuery="update tbl_device_info set device_token = '', updated_at = NOW() where user_id = ?"
                const updatedTokenQuery="update tbl_user set token = '', is_login = 0 where user_id = ?"
            
            await Promise.all([
                database.query(updatedUserQuery, [user_id]),
                database.query(updatedTokenQuery, [user_id])
            ]);
        
            const getUserQuery = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [updatedUser] = await database.query(getUserQuery, [user_id]);
    
            return callback({
                code: response_code.SUCCESS,
                message: t('logout_success'),
                data: updatedUser[0]
            });
        }else{
            return callback({
                code: response_code.NOT_FOUND,
                message: t('user_not_found_or_logged_out')
            });
        }
        }catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: t('some_error_occurred'),
                data: error
            })
        }
    }

    async delete(request_data,user_id,callback){
        try{
            const selectQuery = "SELECT * FROM tbl_user WHERE user_id = ? and is_login = 1";
            const [info] = await database.query(selectQuery, [user_id]);
            if(info.length === 0){
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "User not found or not logged in"
                });
            }
            const selectUserQuery = "SELECT * FROM tbl_user WHERE user_id = ? AND is_deleted = 0";
            const [user] = await database.query(selectUserQuery, [user_id]);
    
            if (!user.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: t('user_already_deleted')
                });
            }
            const deleteQuery = "update tbl_user set is_deleted = 1,is_active =0,is_login=0 where user_id = ?"
            await database.query(deleteQuery, [user_id]);

            const deleteReviewQuery = "UPDATE tbl_ratings_review SET is_deleted = 1, is_active=0 WHERE user_id = ?";
            await database.query(deleteReviewQuery, [user_id]);
    
            const deleteFavSPQuery = "UPDATE tbl_user_fav_sp SET is_deleted = 1 WHERE user_id = ?";
            await database.query(deleteFavSPQuery, [user_id]);
    
            const deleteFavVoucherQuery = "UPDATE tbl_user_fav_voucher SET is_deleted = 1 WHERE user_id = ?";
            await database.query(deleteFavVoucherQuery, [user_id]);

        }catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error
            });
        }
    }

    async post_review_rating(request_data,user_id,callback){
        try{
            const data={
                user_id:user_id,
                sp_id:request_data.sp_id,
                rating:request_data.rating,
                reviews:request_data.reviews,
                is_active:1,
                is_deleted:0,
                created_at:new Date()
            }
            const selectQuery = `insert into tbl_ratings_review set ?`
            await database.query(selectQuery, [data]);
            return callback({
                code: response_code.SUCCESS,
                message: "Review posted successfully"
            });

        }catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error
            })
        }
    }
}
module.exports = new UserModel();
 