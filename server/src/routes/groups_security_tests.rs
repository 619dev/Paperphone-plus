use super::*;
use axum::{body::{Body, to_bytes}, http::{Request, StatusCode}, routing::get as route_get};
use futures::{SinkExt, StreamExt};
use tower::ServiceExt;
use serde_json::{json, Value};
use tokio_tungstenite::{connect_async, tungstenite::Message};

async fn request(app: &Router, method: &str, url: &str, user: &str, body: Value) -> (StatusCode, Value) {
    let token = crate::auth::jwt::sign_token(user, user, None, "isolated-group-test");
    let response = app.clone().oneshot(Request::builder().method(method).uri(url)
        .header("Authorization", format!("Bearer {token}")).header("Content-Type","application/json")
        .body(Body::from(body.to_string())).unwrap()).await.unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap_or_else(|_| json!({"raw":String::from_utf8_lossy(&bytes),"url":url})))
}
fn upload(members: &[&str], epoch: u32) -> Value {
    json!({"key_version":epoch,"distributions":members.iter().map(|id|json!({"to_id":id,"encrypted_key":"test-encrypted-key","header":"pps1.test-signed-distribution"})).collect::<Vec<_>>()})
}
fn group_message(group: &str, from: &str, epoch: u32) -> Value {
    let id = Uuid::new_v4().to_string();
    let meta = json!({"group":group,"from":from,"epoch":epoch,"id":id,"type":"text","nonce":"test-nonce"});
    json!({"type":"message","group_id":group,"msg_type":"text","client_msg_id":id,"ciphertext":"test-ciphertext","nonce":"test-nonce","sender_key_version":epoch,"header":format!("ppg1.{}",json!({"meta":meta,"signature":"client-verifies-cryptography"}))})
}
type Socket = tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;
async fn event(socket: &mut Socket, kind: &str) -> Value {
    tokio::time::timeout(std::time::Duration::from_secs(10), async {
        loop {
            let message = socket.next().await.expect("socket closed").unwrap();
            if let Message::Text(text) = message {
                let value: Value = serde_json::from_str(&text).unwrap();
                if value["type"] == kind { return value; }
            }
        }
    }).await.expect("expected WebSocket event")
}
async fn connect(address: std::net::SocketAddr, user: &str) -> Socket {
    let (mut socket, _) = connect_async(format!("ws://{address}/ws")).await.unwrap();
    let token = crate::auth::jwt::sign_token(user,user,None,"isolated-group-test");
    socket.send(Message::Text(json!({"type":"auth","token":token}).to_string().into())).await.unwrap();
    event(&mut socket,"auth_ok").await;
    socket
}

#[tokio::test]
#[ignore = "requires PP_GROUP_TEST_MYSQL_SOCKET pointing to an isolated local MySQL instance"]
async fn signed_group_revocation_and_catch_up() {
    let socket = std::env::var("PP_GROUP_TEST_MYSQL_SOCKET").expect("Set isolated test MySQL socket");
    let options = sqlx::mysql::MySqlConnectOptions::new().socket(&socket).username("root").charset("utf8mb4");
    let admin = sqlx::MySqlPool::connect_with(options.clone()).await.unwrap();
    let database = format!("pp_group_test_{}",Uuid::new_v4().simple());
    sqlx::query(&format!("CREATE DATABASE `{database}` CHARACTER SET utf8mb4")).execute(&admin).await.unwrap();
    let db = sqlx::mysql::MySqlPoolOptions::new().max_connections(12).connect_with(options.database(&database)).await.unwrap();
    crate::db::mysql::run_schema(&db).await;
    for id in ["a","b","c","d"] {
        sqlx::query("INSERT INTO users (id,username,nickname,password,ik_pub,spk_pub,spk_sig,kem_pub) VALUES (?,?,?,'unused','ik','spk','sig','sign')")
            .bind(id).bind(id).bind(id).execute(&db).await.unwrap();
    }
    let mut config = crate::config::Config::from_env();
    config.jwt_secret="isolated-group-test".into();
    config.bark_allowed_hosts=vec!["api.day.app".into()];
    config.redis_port=1; // Fail immediately; no external Redis service is needed.
    let state = Arc::new(AppState { db:db.clone(),redis:crate::db::redis::create_redis_pool(&config),config,ws_clients:Default::default() });
    let app = Router::new().nest("/groups",router()).nest("/messages",crate::routes::messages::router()).nest("/push",crate::routes::push::router()).route("/ws",route_get(crate::ws::server::ws_handler)).with_state(state.clone());
    assert_eq!(request(&app,"POST","/push/bark","a",json!({"endpoint":"https://not-allowed.example/key"})).await.0,StatusCode::BAD_REQUEST);
    assert_eq!(request(&app,"POST","/push/bark","a",json!({"endpoint":"https://api.day.app/private-test-key"})).await.0,StatusCode::OK);
    let (_,bark)=request(&app,"GET","/push/bark","a",json!(null)).await;
    assert_eq!(bark["configured"],true);
    assert!(!bark.to_string().contains("private-test-key"));
    assert_eq!(request(&app,"GET","/push/bark","b",json!(null)).await.1["configured"],false);
    assert_eq!(request(&app,"DELETE","/push/bark","a",json!(null)).await.0,StatusCode::OK);
    assert_eq!(request(&app,"GET","/push/bark","a",json!(null)).await.1["configured"],false);
    let (status, created)=request(&app,"POST","/groups","a",json!({"name":"secure","member_ids":["b","c"]})).await;
    assert_eq!(status,StatusCode::CREATED,"{created}");
    let group=created["id"].as_str().unwrap();
    let keys_url=format!("/groups/{group}/sender-keys");
    let (status,detail)=request(&app,"GET",&format!("/groups/{group}"),"a",json!(null)).await;
    assert_eq!(status,StatusCode::OK);
    assert_eq!(detail["key_epoch"],1);
    assert_eq!(detail["encrypted"],true);
    assert_eq!(request(&app,"POST",&keys_url,"a",upload(&["a","b"],1)).await.0,StatusCode::BAD_REQUEST);
    assert_eq!(request(&app,"POST",&keys_url,"a",upload(&["a","b","c"],1)).await.0,StatusCode::OK);
    assert_eq!(request(&app,"POST",&keys_url,"a",upload(&["a","b","c"],1)).await.0,StatusCode::CONFLICT);
    assert_eq!(request(&app,"POST",&keys_url,"b",upload(&["a","b","c"],1)).await.0,StatusCode::OK);
    assert_eq!(request(&app,"DELETE",&format!("/groups/{group}/members/c"),"b",json!(null)).await.0,StatusCode::FORBIDDEN);
    assert_eq!(request(&app,"GET",&format!("/groups/{group}"),"d",json!(null)).await.0,StatusCode::FORBIDDEN);
    assert_eq!(request(&app,"PUT",&format!("/groups/{group}/encryption"),"a",json!({"encrypted":false})).await.0,StatusCode::BAD_REQUEST);
    let listener=tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address=listener.local_addr().unwrap();
    let serve_app=app.clone();
    let server=tokio::spawn(async move { axum::serve(listener,serve_app).await.unwrap(); });
    let mut a=connect(address,"a").await;
    let mut b=connect(address,"b").await;
    let first=group_message(group,"b",1);
    b.send(Message::Text(first.to_string().into())).await.unwrap();
    event(&mut b,"ack").await;
    let (status,result)=request(&app,"POST",&format!("/groups/{group}/leave"),"b",json!({})).await;
    assert_eq!(status,StatusCode::OK,"{result}");
    assert_eq!(result["key_epoch"],2);
    assert_eq!(event(&mut a,"sender_key_rotate").await["key_epoch"],2);
    assert_eq!(event(&mut b,"group_removed").await["group_id"],group);
    assert_eq!(request(&app,"GET",&keys_url,"b",json!(null)).await.0,StatusCode::FORBIDDEN);
    assert_eq!(request(&app,"GET",&format!("/messages/group/{group}"),"b",json!(null)).await.0,StatusCode::FORBIDDEN);
    assert_eq!(request(&app,"POST",&keys_url,"b",upload(&["a","c"],2)).await.0,StatusCode::FORBIDDEN);
    assert_eq!(request(&app,"POST",&keys_url,"a",upload(&["a","b","c"],1)).await.0,StatusCode::CONFLICT);
    assert_eq!(request(&app,"POST",&keys_url,"a",upload(&["a","b","c"],2)).await.0,StatusCode::BAD_REQUEST);
    // Exact retry after a lost ACK remains idempotent across a rotation.
    b.send(Message::Text(first.to_string().into())).await.unwrap();
    event(&mut b,"ack").await;
    let mut conflict=first.clone(); conflict["ciphertext"]=json!("different-body");
    b.send(Message::Text(conflict.to_string().into())).await.unwrap();
    assert_eq!(event(&mut b,"message_failed").await["code"],"client_message_conflict");
    // The still-connected ex-member cannot continue posting, even with old keys.
    b.send(Message::Text(group_message(group,"b",1).to_string().into())).await.unwrap();
    assert_eq!(event(&mut b,"message_failed").await["code"],"not_group_member");
    a.send(Message::Text(group_message(group,"a",1).to_string().into())).await.unwrap();
    assert_eq!(event(&mut a,"message_failed").await["code"],"group_epoch_expired");
    assert_eq!(request(&app,"POST",&keys_url,"a",upload(&["a","c"],2)).await.0,StatusCode::OK);
    let mut unsigned=group_message(group,"a",2); unsigned["header"]=json!(null);
    a.send(Message::Text(unsigned.to_string().into())).await.unwrap();
    assert_eq!(event(&mut a,"message_failed").await["code"],"group_signature_required");
    a.send(Message::Text(group_message(group,"a",2).to_string().into())).await.unwrap();
    event(&mut a,"ack").await;
    let (status,history_keys)=request(&app,"GET",&keys_url,"c",json!(null)).await;
    assert_eq!(status,StatusCode::OK);
    assert!(history_keys["keys"].as_array().unwrap().iter().any(|k|k["from_id"]=="b"&&k["key_version"]==1),"offline members retain pre-departure distributions");
    assert!(history_keys["keys"].as_array().unwrap().iter().any(|k|k["from_id"]=="a"&&k["key_version"]==2));
    let (status,history)=request(&app,"GET","/messages/sync?after=0&limit=1","c",json!(null)).await;
    assert_eq!(status,StatusCode::OK);
    assert_eq!(history["messages"][0]["from"],"b");
    assert_eq!(history["has_more"],true);
    let (_,group_history)=request(&app,"GET",&format!("/messages/group/{group}?limit=1"),"c",json!(null)).await;
    let newest=group_history[0]["server_seq"].as_u64().unwrap();
    let (_,older)=request(&app,"GET",&format!("/messages/group/{group}?limit=1&before_seq={newest}"),"c",json!(null)).await;
    assert_eq!(older[0]["from"],"b","sequence pagination does not skip same-timestamp messages");
    let cursor=history["next_cursor"].as_u64().unwrap();
    let (_,next)=request(&app,"GET",&format!("/messages/sync?after={cursor}&limit=1"),"c",json!(null)).await;
    assert_eq!(next["messages"][0]["from"],"a");
    let (_,excluded)=request(&app,"GET","/messages/sync?after=0","b",json!(null)).await;
    assert!(excluded["messages"].as_array().unwrap().is_empty());
    // Sync must wait for an in-flight lower server_seq to commit.
    let mut pending=db.begin().await.unwrap();
    sqlx::query("SELECT id FROM message_sync_barrier WHERE id=1 FOR UPDATE").fetch_one(&mut *pending).await.unwrap();
    sqlx::query("INSERT INTO messages (id,type,from_id,to_id,ciphertext,msg_type,sender_key_version) VALUES (?,'group','a',?,'pending','text',2)")
        .bind(Uuid::new_v4().to_string()).bind(group).execute(&mut *pending).await.unwrap();
    let sync_app=app.clone();
    let waiting=tokio::spawn(async move { request(&sync_app,"GET","/messages/sync?after=0","c",json!(null)).await });
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    assert!(!waiting.is_finished(),"sync cannot jump past an uncommitted message");
    pending.commit().await.unwrap();
    assert_eq!(waiting.await.unwrap().1["messages"].as_array().unwrap().len(),3);
    // Joining now cannot fetch old group traffic or old key distributions.
    let (status,joined)=request(&app,"POST",&format!("/groups/{group}/members"),"a",json!({"user_ids":["d"]})).await;
    assert_eq!(status,StatusCode::OK,"{joined}"); assert_eq!(joined["key_epoch"],3);
    assert!(request(&app,"GET",&keys_url,"d",json!(null)).await.1["keys"].as_array().unwrap().is_empty());
    assert!(request(&app,"GET","/messages/sync?after=0","d",json!(null)).await.1["messages"].as_array().unwrap().is_empty());
    // A concurrent old-epoch upload either commits before leave and is retired,
    // or loses the group-row lock and is rejected. It cannot survive revocation.
    let mut gate=db.begin().await.unwrap();
    sqlx::query("SELECT key_epoch FROM `groups` WHERE id=? FOR UPDATE").bind(group).fetch_one(&mut *gate).await.unwrap();
    let upload_app=app.clone(); let upload_url=keys_url.clone();
    let uploading=tokio::spawn(async move { request(&upload_app,"POST",&upload_url,"a",upload(&["a","c","d"],3)).await });
    let leave_app=app.clone(); let leave_url=format!("/groups/{group}/leave");
    let leaving=tokio::spawn(async move { request(&leave_app,"POST",&leave_url,"c",json!({})).await });
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    assert!(!uploading.is_finished() && !leaving.is_finished());
    gate.commit().await.unwrap();
    let published=uploading.await.unwrap().0;
    assert!(published==StatusCode::OK || published==StatusCode::CONFLICT);
    assert_eq!(leaving.await.unwrap().1["key_epoch"],4);
    let (active,):(i64,)=sqlx::query_as("SELECT COUNT(*) FROM group_sender_keys WHERE group_id=?").bind(group).fetch_one(&db).await.unwrap();
    assert_eq!(active,0);
    let (revoked,):(i64,)=sqlx::query_as("SELECT COUNT(*) FROM group_sender_key_distributions WHERE group_id=? AND to_id='c'").bind(group).fetch_one(&db).await.unwrap();
    assert_eq!(revoked,0);
    assert_eq!(request(&app,"POST",&format!("/groups/{group}/members"),"a",json!({"user_ids":["c"]})).await.1["key_epoch"],5);
    assert!(request(&app,"GET",&keys_url,"c",json!(null)).await.1["keys"].as_array().unwrap().is_empty(),"rejoining does not restore revoked key distributions");
    assert!(request(&app,"GET","/messages/sync?after=0","c",json!(null)).await.1["messages"].as_array().unwrap().is_empty(),"rejoining starts a new membership epoch");
    // Migrate an existing unencrypted group without deleting its old history.
    sqlx::query("INSERT INTO `groups` (id,name,owner_id,encrypted,signed_protocol) VALUES ('legacy','legacy','a',0,0)").execute(&db).await.unwrap();
    sqlx::query("INSERT INTO group_members (group_id,user_id,role) VALUES ('legacy','a','owner')").execute(&db).await.unwrap();
    sqlx::query("INSERT INTO messages (id,type,from_id,to_id,ciphertext,msg_type) VALUES (?,'group','a','legacy','unsigned history','text')").bind(Uuid::new_v4().to_string()).execute(&db).await.unwrap();
    // Schema reruns do not reset active epochs or erase historical keys.
    crate::db::mysql::run_schema(&db).await;
    assert_eq!(request(&app,"GET",&format!("/groups/{group}"),"a",json!(null)).await.1["key_epoch"],5);
    let (_,legacy)=request(&app,"GET","/groups/legacy","a",json!(null)).await;
    assert_eq!(legacy["encrypted"],true); assert_eq!(legacy["key_epoch"],2);
    assert_eq!(request(&app,"GET","/messages/group/legacy","a",json!(null)).await.1.as_array().unwrap().len(),1);
    rotate_identity_groups(&state,"a").await.unwrap();
    assert_eq!(request(&app,"GET",&format!("/groups/{group}"),"a",json!(null)).await.1["key_epoch"],6);
    a.close(None).await.ok(); b.close(None).await.ok(); server.abort();
    db.close().await;
    sqlx::query(&format!("DROP DATABASE `{database}`")).execute(&admin).await.unwrap();
    admin.close().await;
}
