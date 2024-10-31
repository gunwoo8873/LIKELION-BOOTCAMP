mod routes;

use actix_web::{App, HttpServer};
use std::{io::{Result}};
use routes::config_route;

// use std::{fs, io::{Result}};

#[actix_web::main]
async fn main() -> Result<()> {
    HttpServer::new(|| {
        App::new().configure(config_route)
    })
        .bind("127.0.0.1:8000")?
        .run()
        .await
}