use axum::response::Html;

pub async fn page() -> Html<&'static str> {
    Html(include_str!("home.html"))
}
