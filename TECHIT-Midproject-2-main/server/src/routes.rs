// use std::fs;
// use actix_web::{get, post, web, App, HttpRequest, HttpResponse, HttpServer, Responder, Scope};

// #[get("/")] // Default Route
// async fn index() -> impl Responder {
//     match fs::read_to_string("./public/index.html") {
//         Ok(content) => HttpResponse::Ok().body(content),
//         Err(_) => HttpResponse::InternalServerError().body("Internal Server Error"),
//     }
//     // let index_path = fs::read_to_string("./public/index.html").unwrap();
//     // HttpResponse::Ok().body(index_path)
// }
//
// #[get("/signin")]
// async fn signin() -> impl Responder {
//     match fs::read_to_string("./public/signin.html") {
//         Ok(content) => HttpResponse::Ok().body(content),
//         Err(_) => HttpResponse::InternalServerError().body("Internal Server Error"),
//     }
//     // let signin_path = fs::read_to_string("./public/signin.html").unwrap();
//     // HttpResponse::Ok().body(signin_path)
// }
//
// #[get("/register")]
// async fn register() -> impl Responder {
//     match fs::read_to_string("./public/register.html") {
//         Ok(content) => HttpResponse::Ok().body(content),
//         Err(_) => HttpResponse::InternalServerError().body("Internal Server Error"),
//     }
//     // let register_path = fs::read_to_string("./public/register.html").unwrap();
//     // HttpResponse::Ok().body(register_path)
// }
//
// #[post("/{id}")]
// async fn post_id(req: HttpRequest) -> impl Responder {
//     let id = req.match_info().get("id").unwrap_or("unknown");
//     HttpResponse::Ok().body(format!("Request with id : {}!", id))
// }
//
// pub fn routers_config(cfg: &mut web::ServiceConfig) {
//     cfg.service(index)
//         .service(signin)
//         .service(register)
//         .service(post_id);
// }


use actix_web::{web, HttpResponse, HttpRequest, Responder};
use std::fs;

async fn handle_get(req: HttpRequest) -> impl Responder {
    let page = req.match_info().get("page").unwrap_or("index");
    let file_path = format!("public/{}.html", page);
    println!("Attempting to read file: {}", file_path);

    match fs::read_to_string(file_path) {
        Ok(content) => HttpResponse::Ok().body(content),
        Err(_) => HttpResponse::NotFound().body("Internal Server Error"),
    }
}

async fn handle_post(form: web::Form<serde_json::Value>) -> impl Responder {
    println!("Received form data: {:?}", form);  // 폼 데이터를 출력
    HttpResponse::Ok().body("Form data received successfully!")
}

pub fn config_route(cfg: &mut web::ServiceConfig) {
    // cfg.route("/{page}", web::get().to(serve_html))
    cfg
        .route("/", web::get().to(handle_get))
        .route("/{page}", web::get().to(handle_get))
        .route("/submit", web::post().to(handle_post));
}