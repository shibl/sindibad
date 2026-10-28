use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::{Value, json};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("unauthorized")]
    Unauthorized,
    #[error("forbidden")]
    Forbidden,
    #[error("not found")]
    NotFound,
    #[error("too many requests")]
    TooMany,
    #[error("{0}")]
    Bad(String),
    /// 409, with the server's copy for the client to merge.
    #[error("conflict")]
    Conflict(Value),
    #[error("database: {0}")]
    Db(#[from] sqlx::Error),
}

pub type Result<T> = std::result::Result<T, AppError>;

pub fn bad(message: impl Into<String>) -> AppError {
    AppError::Bad(message.into())
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, body) = match self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, json!({ "error": "unauthorized" })),
            AppError::Forbidden => (StatusCode::FORBIDDEN, json!({ "error": "forbidden" })),
            AppError::NotFound => (StatusCode::NOT_FOUND, json!({ "error": "not found" })),
            AppError::TooMany => (StatusCode::TOO_MANY_REQUESTS, json!({ "error": "too many requests" })),
            AppError::Bad(message) => (StatusCode::BAD_REQUEST, json!({ "error": message })),
            AppError::Conflict(body) => (StatusCode::CONFLICT, body),
            AppError::Db(error) => {
                tracing::error!(%error, "database");
                (StatusCode::INTERNAL_SERVER_ERROR, json!({ "error": "server error" }))
            }
        };
        (status, Json(body)).into_response()
    }
}
