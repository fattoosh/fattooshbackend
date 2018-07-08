// Errors Definitions
const errors = {
    conn_err: location => `##\t Couldn't get connection at: ${location}`,
    query_err: location => `##\t Couldn't query at: ${location}`,
    not_found_err: (data, location) => `##\t No ${data} found at: ${location}`,
    token_expired_err: location => `##\t Token Expired at: ${location}`,
    token_verification_err: (location, error) => (`##\t Token verification error at: ${location} 
        ##\t error: ${error}`
    ),
    wrong_password_err: location => `##\t Wrong Password Entered at: ${location}`,
    employee_disabled_err: location => `###\t Employee is disabled at: ${location}`,
    no_permission_err: () => 'No Persmission'
};

// Module Export
module.exports = errors; 
