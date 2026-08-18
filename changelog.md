# Changelog / 更新日志

All notable changes and new features are recorded here. Historical entries below were migrated from the repository documentation.

所有重要版本改动和新特性统一记录于此。下方历史条目由仓库原有文档迁移而来。

## 2.4.7

- Fixed E2EE safety-number mismatches by deriving both views from the same pair of published identity keys; text appearance and its extra password remain independent of the E2EE safety number.
- Fixed one-to-one video calls that could play audio while leaving the remote video black; remote LiveKit tracks now use native track attachment and explicit mobile playback.
- Fixed the call-duration race that could leave an established call at `00:00`.
- Added ordered multi-image sending with a maximum of 20 images per selection and per-image upload progress.
- Added per-account, per-conversation scroll-position memory and a one-tap button to jump to the latest message.
- Updated the application and native platform versions to `2.4.7`.

- 修复 E2EE 安全号码不一致：双方现在基于服务器发布的同一对身份公钥计算；文本外观及其额外密码仍与 E2EE 安全号码相互独立。
- 修复私聊视频通话只有声音、远端画面黑屏的问题；远端 LiveKit 媒体改用原生轨道绑定，并显式兼容移动端播放。
- 修复通话已经接通但计时器停留在 `00:00` 的事件竞态。
- 新增多图片发送：一次最多选择 20 张，保持选择顺序并显示逐张上传进度。
- 新增按账号、按会话保存屏幕滚动位置，以及一键跳到最新消息按钮。
- 应用及原生平台版本统一更新为 `2.4.7`。

---

# Historical entries from README.md

## v2.4.6 更新

- 全面补充文本外观的双层加密说明：正文先由共享额外密码加密并转换外观，再进入原有私聊 E2EE 或群聊 Sender Key 加密链路。
- 明确私聊双方或群内所有成员必须自行约定相同的额外密码；密码不上传也不自动同步。
- 密码不一致时，E2EE 和消息送达仍正常，但接收方只能看到文本外观密文。该功能是 E2EE 之上的额外保险，不替代、不绕过也不降级原有加密。
- 个人信息 > 消息隐私页面的 8 种语言说明已同步更新。

---

## v2.4.4 更新

- 修复额外加密锁定状态下的密码框错误显示“设置密码”；现在会明确提示“输入解锁密码”，并同步更新全部 8 种语言。

- 修复关闭额外文本外观加密时未验证密码的安全问题；现在即使已解锁，也必须重新输入正确的额外密码才能关闭。
- 文本外观现在会隐藏协议前缀、盐值和 IV，发送中的本地缓存也不再保留原始正文。
- 额外聊天记录加密已移至个人信息 > 消息隐私，并全局应用于本设备的所有聊天。

- 加密会话改为失败即停止：加密、密钥分发或安全存储失败时不再降级为明文发送；消息气泡会准确标示 `PQ v2`、`X25519 ↓` 或 `SK vN`。
- 新增可选的聊天记录额外密码与 8 种独立文本外观编码：与佛论禅、随机中文、易经符号、韩文、埃及象形文字、楔形文字、核心价值观文本和英数字。
- 未输入或输错额外密码时只显示文本外观；应用离开前台 5/15/30/60 分钟后可自动锁定。额外密码只保存在内存中，本地仅保存验证信息。
- 加强身份私钥与 Sender Key 的本地保护：Web 使用 AES-GCM 包装的 IndexedDB，原生端使用系统安全存储；并补齐全部 8 种语言的界面文案。

---

## v2.3.9 更新

- 修复历史单向好友记录导致“已是好友”但联系人列表不可见、无法聊天的问题；再次添加时会自动补齐双向关系并立即刷新好友列表。

---

## v2.3.8 更新

- 修复扫码启动摄像头后左上角返回按钮无法退出的问题，退出时会立即停止并释放摄像头。
- 修复向已有好友重复发送添加请求会破坏好友关系的问题；搜索结果现在会明确标记“已是好友”。
- 私聊消息完成端到端加密后立即把密文写入发送中的乐观消息对象，避免等待服务器确认期间将明文短暂持久化到离线缓存。
- 语音消息最长 120 秒，到达上限后自动停止；变声处理后的音频同样限制为 120 秒。
- 录制语音和通话期间保持屏幕唤醒，离开页面时可靠释放录音设备与计时器。
- Android、iOS、Windows 和 macOS 客户端使用操作系统安全存储保护本地身份私钥与 Sender Key；Web 版使用 AES-GCM 包装的 IndexedDB。聊天缓存与私钥存储是不同的安全边界，不再使用旧的“四层持久化”描述。

---

---

# Historical entries from README_DE.md

## Neu in v2.4.6

- Der zweistufige Ablauf der Textdarstellung ist nun vollständig dokumentiert: Das gemeinsame Zusatzpasswort verschlüsselt und formatiert den Inhalt zuerst; danach verschlüsselt die bestehende E2EE oder der Gruppen-Sender-Key ihn erneut.
- Beide Teilnehmer eines privaten Chats bzw. alle Gruppenmitglieder müssen dasselbe Passwort verwenden; es wird weder hochgeladen noch synchronisiert.
- Bei unterschiedlichen Passwörtern funktionieren E2EE und Zustellung weiterhin, aber nur der formatierte Geheimtext ist sichtbar. Die Funktion ist eine zusätzliche Absicherung und ersetzt, umgeht oder schwächt E2EE nicht.
- Die Erklärung unter Profil > Nachrichtenschutz wurde in allen acht UI-Sprachen aktualisiert.

---

## Neu in v2.4.4

- Der fehlerhafte Dialog, der bei gesperrter Zusatzverschlüsselung zum Festlegen eines Passworts aufforderte, wurde korrigiert; nun wird in allen acht Sprachen nach dem Entsperrpasswort gefragt.

- Eine Sicherheitslücke wurde behoben, durch die sich die zusätzliche Textdarstellungsverschlüsselung ohne Passwortprüfung deaktivieren ließ; nun muss das korrekte Zusatzpasswort auch im entsperrten Zustand erneut eingegeben werden.
- Die Textdarstellung verbirgt nun Protokollpräfixe, Salt und IV; lokale Nachrichtenentwürfe speichern keinen Originaltext mehr.
- Die zusätzliche Nachrichtenverschlüsselung befindet sich unter Profil > Nachrichtenschutz und gilt global für alle Chats.

- Verschlüsselte Chats arbeiten jetzt fail-closed: Fehler bei Verschlüsselung, Schlüsselverteilung oder sicherer Speicherung führen nie zu einem Klartextversand. Jede Nachricht zeigt das tatsächlich verwendete Protokoll (`PQ v2`, `X25519 ↓` oder `SK vN`).
- Optionales Zusatzpasswort für den Chatverlauf und acht Darstellungs-Codecs: Buddha-Text, zufälliges Chinesisch, I-Ging-Symbole, Koreanisch, ägyptische Hieroglyphen, Keilschrift, Kernwerte-Text und alphanumerisch.
- Ohne korrektes Zusatzpasswort wird nur der Darstellungs-Geheimtext angezeigt; nach 5/15/30/60 Minuten im Hintergrund kann automatisch gesperrt werden. Das Passwort bleibt ausschließlich im Arbeitsspeicher.
- Lokaler Schutz von privaten Identitäts- und Sender Keys durch AES-GCM-gekapseltes IndexedDB im Web und sicheren Systemspeicher in nativen Clients; UI-Texte für alle acht Sprachen vervollständigt.

---

## Neu in v2.3.9

- Alte einseitige Freundschaftseinträge führten zur Meldung „Bereits befreundet“, obwohl der Kontakt unsichtbar blieb und kein Chat möglich war. Beim erneuten Hinzufügen werden nun beide Richtungen automatisch repariert und die Kontaktliste sofort aktualisiert.

---

## Neu in v2.3.8

- Die nicht reagierende Zurück-Schaltfläche nach dem Start der QR-Kamera wurde behoben; beim Schließen wird die Kamera nun sofort gestoppt und freigegeben.
- Doppelte Freundschaftsanfragen an bestehende Freunde beschädigen die Freundschaft nicht mehr; Suchergebnisse zeigen jetzt „Bereits befreundet“ an.
- Ausgehende Privatnachrichten werden direkt nach der Ende-zu-Ende-Verschlüsselung als Chiffretext im optimistischen Nachrichtenobjekt gespeichert; beim Warten auf die Serverbestätigung landet kein Klartext im Offline-Cache.
- Sprachnachrichten stoppen automatisch nach 120 Sekunden; die Ausgabe mit Stimmeffekt hat dasselbe Limit.
- Bei Aufnahmen und Anrufen bleibt der Bildschirm wach; beim Verlassen werden Aufnahmegeräte und Timer zuverlässig freigegeben.
- Android-, iOS-, Windows- und macOS-Clients schützen lokale private Identitätsschlüssel und Sender Keys mit dem sicheren Speicher des Betriebssystems; Web nutzt mit AES-GCM geschütztes IndexedDB. Chat-Caches und die Speicherung privater Schlüssel sind getrennte Sicherheitsbereiche; dies ersetzt die alte Beschreibung einer „vierstufigen Persistenz“.

---

---

# Historical entries from README_EN.md

## What's New in v2.4.6

- Fully documented the two-layer text-appearance flow: the shared extra password encrypts and renders the body first, followed by the existing private-chat E2EE or group Sender Key encryption.
- Clarified that both private-chat participants, or every group member, must agree on the same extra password; it is never uploaded or synchronized.
- With different passwords, E2EE and delivery still work, but recipients see only styled ciphertext. This feature is extra insurance above E2EE and never replaces, bypasses, or downgrades it.
- Updated the Profile > Message privacy explanation in all eight UI languages.

---

## What's New in v2.4.4

- Fixed the extra-encryption unlock dialog incorrectly asking users to set a password while locked; it now requests the unlock password in all eight languages.

- Fixed a security issue that allowed extra text-appearance encryption to be disabled without password verification; the correct extra password must now be re-entered even while unlocked.
- Text appearance now hides protocol prefixes, salts, and IVs; optimistic local messages no longer retain the original body.
- Extra message-history encryption moved to Profile > Message privacy and now applies globally to every chat on the device.

- Encrypted chats now fail closed: encryption, key-distribution, or secure-storage errors can no longer fall back to plaintext; message bubbles report the actual `PQ v2`, `X25519 ↓`, or `SK vN` protocol.
- Added an optional chat-history password and eight independent presentation codecs: Buddha text, random Chinese, I Ching symbols, Hangul, Egyptian hieroglyphs, Cuneiform, Core Values text, and alphanumeric.
- Without the correct extra password, only presentation ciphertext is shown; the app can auto-lock 5/15/30/60 minutes after leaving the foreground. The password remains memory-only and only a verifier is persisted.
- Hardened local identity private-key and Sender Key protection with AES-GCM-wrapped IndexedDB on Web and system secure storage on native clients; completed UI copy for all eight languages.

---

## What's New in v2.3.9

- Fixed legacy one-way friendship records causing an “Already friends” message while the contact remained invisible and unavailable for chat; adding the user again now repairs both directions and refreshes the contact list immediately.

---

## What's New in v2.3.8

- Fixed the unresponsive back button after the QR scanner starts the camera; closing now stops and releases the camera immediately.
- Fixed duplicate friend requests to existing friends corrupting the friendship; search results now clearly show “Already friends.”
- Outgoing private messages populate the optimistic message object with ciphertext immediately after end-to-end encryption, preventing plaintext from being briefly persisted while awaiting the server acknowledgement.
- Voice messages stop automatically at 120 seconds; voice-changed output follows the same limit.
- Voice recording and active calls keep the screen awake, while page cleanup reliably releases recording devices and timers.
- Android, iOS, Windows, and macOS clients protect local identity private keys and Sender Keys with operating-system secure storage; Web uses AES-GCM-wrapped IndexedDB. Chat caches and private-key storage are separate security boundaries, replacing the old "four-layer persistence" description.

---

---

# Historical entries from README_ES.md

## Novedades de v2.4.6

- Se documentó por completo el flujo de dos capas: la contraseña adicional compartida cifra y transforma primero el contenido; después, el E2EE existente o las Sender Keys del grupo vuelven a cifrarlo.
- Ambos participantes del chat privado, o todos los miembros del grupo, deben usar la misma contraseña; nunca se sube ni se sincroniza.
- Si las contraseñas son distintas, el E2EE y la entrega siguen funcionando, pero solo se muestra el texto cifrado con el aspecto elegido. Esta función es una protección adicional y no sustituye, evita ni degrada el E2EE.
- Se actualizó la explicación de Perfil > Privacidad de los mensajes en los ocho idiomas de la interfaz.

---

## Novedades de v2.4.4

- Se corrigió el diálogo de cifrado adicional bloqueado que pedía configurar una contraseña; ahora solicita la contraseña de desbloqueo en los ocho idiomas.

- Se corrigió un problema de seguridad que permitía desactivar el cifrado adicional de apariencia de texto sin verificar la contraseña; ahora es obligatorio volver a introducir la contraseña adicional correcta incluso si está desbloqueado.
- La apariencia de texto ahora oculta prefijos de protocolo, sal e IV; la caché local ya no conserva el texto original.
- El cifrado adicional se trasladó a Perfil > Privacidad de los mensajes y se aplica globalmente a todos los chats.

- Los chats cifrados ahora fallan de forma segura: los errores de cifrado, distribución de claves o almacenamiento seguro nunca provocan un envío en texto claro. Cada mensaje muestra el protocolo realmente utilizado (`PQ v2`, `X25519 ↓` o `SK vN`).
- Se añadió una contraseña opcional para el historial y ocho códecs de presentación: texto budista, chino aleatorio, símbolos del I Ching, coreano, jeroglíficos egipcios, cuneiforme, texto de valores fundamentales y alfanumérico.
- Sin la contraseña adicional correcta solo se muestra el texto cifrado de presentación; puede bloquearse automáticamente tras 5/15/30/60 minutos en segundo plano. La contraseña permanece únicamente en memoria.
- Se reforzó la protección local de claves privadas y Sender Keys con IndexedDB envuelto en AES-GCM en Web y almacenamiento seguro del sistema en clientes nativos; se completó la interfaz en los ocho idiomas.

---

## Novedades de v2.3.9

- Se corrigieron registros antiguos de amistad unidireccionales que mostraban «Ya son amigos» aunque el contacto seguía invisible y no se podía chatear; al volver a añadirlo ahora se reparan ambas direcciones y se actualiza inmediatamente la lista de contactos.

---

## Novedades de v2.3.8

- Se corrigió el botón Atrás que no respondía después de iniciar la cámara del escáner QR; al cerrar, la cámara se detiene y libera inmediatamente.
- Se corrigieron las solicitudes duplicadas a amigos existentes que dañaban la relación; los resultados ahora muestran «Ya son amigos».
- Los mensajes privados salientes guardan el texto cifrado en el objeto optimista justo después del cifrado de extremo a extremo, evitando persistir texto plano mientras llega la confirmación del servidor.
- Los mensajes de voz se detienen automáticamente a los 120 segundos; el audio con cambio de voz usa el mismo límite.
- La pantalla permanece activa durante grabaciones y llamadas, y al salir se liberan de forma fiable dispositivos y temporizadores.
- Los clientes Android, iOS, Windows y macOS protegen las claves privadas de identidad y las Sender Keys locales con el almacenamiento seguro del sistema operativo; Web usa IndexedDB protegido con AES-GCM. La caché de chats y el almacenamiento de claves privadas son límites de seguridad distintos, lo que reemplaza la antigua descripción de «persistencia en cuatro capas».

---

---

# Historical entries from README_FR.md

## Nouveautés de la v2.4.6

- Documentation complète du double chiffrement de l’apparence du texte : le mot de passe supplémentaire partagé chiffre et transforme d’abord le contenu, puis l’E2EE existant ou les Sender Keys du groupe le chiffrent de nouveau.
- Les deux correspondants, ou tous les membres d’un groupe, doivent utiliser le même mot de passe ; il n’est jamais envoyé ni synchronisé.
- Si les mots de passe diffèrent, l’E2EE et la livraison fonctionnent toujours, mais seul le texte chiffré stylisé apparaît. Cette fonction est une assurance supplémentaire et ne remplace, ne contourne ni ne dégrade l’E2EE.
- Mise à jour de l’explication Profil > Confidentialité des messages dans les huit langues de l’interface.

---

## Nouveautés de la v2.4.4

- Correction de la boîte de dialogue du chiffrement supplémentaire verrouillé qui demandait à tort de définir un mot de passe ; elle demande désormais le mot de passe de déverrouillage dans les huit langues.

- Correction d’une faille permettant de désactiver le chiffrement supplémentaire de l’apparence du texte sans vérifier le mot de passe ; le bon mot de passe supplémentaire doit désormais être saisi à nouveau, même lorsque le contenu est déverrouillé.
- L’apparence du texte masque désormais préfixes de protocole, sel et IV ; le cache local ne conserve plus le texte original.
- Le chiffrement supplémentaire se trouve dans Profil > Confidentialité des messages et s’applique globalement à tous les chats.

- Les conversations chiffrées échouent désormais de façon sûre : aucune erreur de chiffrement, de distribution de clé ou de stockage sécurisé ne peut entraîner un envoi en clair. Chaque message affiche le protocole réellement utilisé (`PQ v2`, `X25519 ↓` ou `SK vN`).
- Ajout d'un mot de passe facultatif pour l'historique et de huit codecs de présentation : texte bouddhique, chinois aléatoire, symboles du Yi Jing, coréen, hiéroglyphes égyptiens, cunéiforme, valeurs fondamentales et alphanumérique.
- Sans le bon mot de passe, seul le texte d'apparence chiffrée est visible ; verrouillage automatique possible après 5/15/30/60 minutes en arrière-plan. Le mot de passe reste uniquement en mémoire.
- Protection renforcée des clés privées et Sender Keys via IndexedDB enveloppé par AES-GCM sur le Web et le stockage sécurisé du système sur les clients natifs ; interface finalisée dans les huit langues.

---

## Nouveautés de la v2.3.9

- Correction des anciennes relations d’amitié à sens unique qui affichaient « Déjà amis » alors que le contact restait invisible et indisponible pour discuter ; un nouvel ajout répare désormais les deux sens et actualise immédiatement la liste des contacts.

---

## Nouveautés de la v2.3.8

- Correction du bouton Retour inactif après le démarrage de la caméra du scanner QR ; la fermeture arrête et libère désormais immédiatement la caméra.
- Correction des demandes d’ami répétées à un ami existant qui endommageaient la relation ; les résultats indiquent désormais « Déjà amis ».
- Les messages privés sortants placent le texte chiffré dans l’objet optimiste dès la fin du chiffrement de bout en bout, sans persister temporairement le texte en clair avant l’accusé du serveur.
- Les messages vocaux s’arrêtent automatiquement à 120 secondes ; la sortie avec changement de voix suit la même limite.
- L’écran reste actif pendant les enregistrements et appels, et les périphériques ainsi que les minuteurs sont libérés en quittant la page.
- Les clients Android, iOS, Windows et macOS protègent les clés privées d'identité et les Sender Keys locales avec le stockage sécurisé du système ; le Web utilise IndexedDB enveloppé par AES-GCM. Le cache des conversations et le stockage des clés privées constituent des périmètres de sécurité distincts, ce qui remplace l'ancienne description de « persistance à quatre couches ».

---

---

# Historical entries from README_JA.md

## v2.4.6 の更新内容

- 文字表現の 2 層暗号化を明確化：共有追加パスワードで本文を暗号化・変換した後、既存の個人チャット E2EE またはグループ Sender Key で再度暗号化します。
- 個人チャットの双方またはグループ全員が同じパスワードを設定する必要があり、パスワードは送信も自動同期もされないことを明記しました。
- パスワードが異なっても E2EE と配信は正常ですが、文字表現の暗号文のみが表示されます。これは E2EE の上に追加する保険であり、E2EE を代替・迂回・弱体化しません。
- 「プロフィール > メッセージのプライバシー」の 8 言語の説明を更新しました。

---

## v2.4.4 の更新内容

- 追加暗号化のロック中にパスワード設定を求める誤った表示を修正し、8 言語すべてでロック解除パスワードの入力を明確に案内するようにしました。

- 追加の文字表現暗号化をパスワード確認なしで無効化できたセキュリティ問題を修正しました。ロック解除中でも、無効化には正しい追加パスワードの再入力が必要です。
- 文字表現がプロトコル接頭辞、ソルト、IV を隠し、送信中のローカルキャッシュにも原文を保持しなくなりました。
- 追加暗号化をプロフィール > メッセージのプライバシーへ移動し、端末内の全チャットに適用しました。

- 暗号化、鍵配布、安全な保存に失敗した場合は送信を停止し、平文へフォールバックしない fail-closed 方式に変更しました。各メッセージに実際の `PQ v2`、`X25519 ↓`、`SK vN` を表示します。
- 任意のチャット履歴用追加パスワードと、仏文風、ランダム中国語、易経記号、ハングル、エジプト象形文字、楔形文字、核心価値観、英数字の 8 種類の表示コーデックを追加しました。
- 正しい追加パスワードがない場合は表示用暗号文のみを表示し、バックグラウンド移行後 5/15/30/60 分で自動ロックできます。パスワードはメモリ内だけに保持されます。
- Web の AES-GCM ラップ IndexedDB とネイティブのシステム安全領域で秘密鍵と Sender Key を保護し、8 言語の UI 文言を完成させました。

---

## v2.3.9 の更新内容

- 古い一方向の友達関係データにより、「友達です」と表示されても連絡先に現れずチャットできない問題を修正しました。再度追加すると双方向の関係が自動修復され、連絡先一覧がすぐに更新されます。

---

## v2.3.8 の更新内容

- QRスキャナーでカメラ起動後に戻るボタンが反応しない問題を修正し、終了時にカメラを即座に停止・解放するようにしました。
- 既存の友達への重複申請で友達関係が壊れる問題を修正し、検索結果に「友達です」と表示するようにしました。
- エンドツーエンド暗号化の完了直後に送信中の個人メッセージへ暗号文を設定し、サーバー確認待ちの間に平文が一時保存されることを防止しました。
- 音声メッセージは最長120秒で自動停止し、ボイスチェンジ後の音声も同じ上限です。
- 録音中と通話中は画面をスリープさせず、ページ離脱時に録音デバイスとタイマーを確実に解放します。
- Android、iOS、Windows、macOS クライアントはローカルのアイデンティティ秘密鍵と Sender Key を OS のセキュアストレージで保護し、Web は AES-GCM でラップした IndexedDB を使用します。チャットキャッシュと秘密鍵ストレージは別のセキュリティ境界であり、旧来の「4 層永続化」という説明を置き換えます。

---

---

# Historical entries from README_KO.md

## v2.4.6 업데이트

- 텍스트 모양의 2중 암호화 흐름을 명확히 문서화했습니다. 공유 추가 비밀번호로 본문을 암호화·변환한 뒤 기존 개인 채팅 E2EE 또는 그룹 Sender Key로 다시 암호화합니다.
- 개인 채팅 양쪽 또는 그룹의 모든 멤버가 같은 비밀번호를 설정해야 하며, 비밀번호는 업로드되거나 자동 동기화되지 않습니다.
- 비밀번호가 달라도 E2EE와 전송은 정상 작동하지만 텍스트 모양 암호문만 표시됩니다. 이 기능은 E2EE 위의 추가 보험이며 E2EE를 대체·우회·약화하지 않습니다.
- 프로필 > 메시지 개인정보 설명을 8개 인터페이스 언어에서 모두 업데이트했습니다.

---

## v2.4.4 업데이트

- 추가 암호화가 잠긴 상태에서 비밀번호 설정을 잘못 안내하던 문제를 수정하고, 8개 언어 모두에서 잠금 해제 비밀번호 입력을 명확히 안내합니다.

- 비밀번호 확인 없이 추가 텍스트 모양 암호화를 끌 수 있던 보안 문제를 수정했습니다. 잠금이 해제된 상태에서도 올바른 추가 비밀번호를 다시 입력해야 암호화를 끌 수 있습니다.
- 텍스트 모양이 프로토콜 접두사, 솔트, IV를 숨기며 전송 중 로컬 캐시에 원문을 보관하지 않습니다.
- 추가 암호화 설정을 프로필 > 메시지 개인정보 보호로 이동하고 기기의 모든 채팅에 전역 적용했습니다.

- 암호화, 키 배포 또는 보안 저장이 실패하면 전송을 중단하며 평문으로 폴백하지 않습니다. 각 메시지에 실제 `PQ v2`, `X25519 ↓`, `SK vN` 프로토콜을 표시합니다.
- 선택형 채팅 기록 추가 암호와 불교 문구, 무작위 중국어, 주역 기호, 한글, 이집트 상형문자, 설형문자, 핵심 가치관 문구, 영숫자 등 8개 표시 코덱을 추가했습니다.
- 올바른 추가 암호가 없으면 표시용 암호문만 보이며, 앱이 백그라운드로 간 뒤 5/15/30/60분에 자동 잠금할 수 있습니다. 암호는 메모리에만 유지됩니다.
- Web의 AES-GCM 래핑 IndexedDB와 네이티브 시스템 보안 저장소로 개인 키와 Sender Key 보호를 강화하고 8개 언어 UI 번역을 완성했습니다.

---

## v2.3.9 업데이트

- 기존 단방향 친구 관계 데이터 때문에 “이미 친구입니다”라고 표시되지만 연락처에 나타나지 않고 채팅할 수 없던 문제를 수정했습니다. 사용자를 다시 추가하면 양방향 관계를 자동으로 복구하고 연락처 목록을 즉시 새로 고칩니다.

---

## v2.3.8 업데이트

- QR 스캐너 카메라 시작 후 뒤로 가기 버튼이 작동하지 않던 문제를 수정했으며, 닫을 때 카메라를 즉시 중지하고 해제합니다.
- 기존 친구에게 중복 요청을 보내면 친구 관계가 손상되던 문제를 수정했으며, 검색 결과에 ‘이미 친구입니다’가 표시됩니다.
- 종단간 암호화 직후 발신 개인 메시지의 낙관적 객체에 암호문을 기록하여 서버 확인을 기다리는 동안 평문이 잠시 저장되지 않도록 했습니다.
- 음성 메시지는 최대 120초에서 자동 중지되며 음성 변조 결과에도 같은 제한을 적용합니다.
- 녹음과 통화 중 화면을 켜 두고 페이지를 떠날 때 녹음 장치와 타이머를 확실히 해제합니다.
- Android·iOS·Windows·macOS 클라이언트는 로컬 식별 개인 키와 Sender Key를 OS 보안 저장소로 보호하며, Web은 AES-GCM으로 래핑한 IndexedDB를 사용합니다. 채팅 캐시와 개인 키 저장소는 서로 다른 보안 경계이며, 기존의 '사중 영구 저장' 설명을 대체합니다.

---

---

# Historical entries from README_RU.md

## Новое в v2.4.6

- Полностью описан двухслойный порядок: общий дополнительный пароль сначала шифрует и оформляет текст, затем его повторно шифрует E2EE или Sender Key группы.
- Оба собеседника или все участники группы должны использовать одинаковый пароль; он не передаётся и не синхронизируется.
- При разных паролях E2EE и доставка работают, но виден только оформленный шифротекст. Это дополнительная страховка, которая не заменяет, не обходит и не ослабляет E2EE.
- Обновлено описание в разделе «Профиль > Конфиденциальность сообщений» на восьми языках.

---

## Новое в v2.4.4

- Исправлен диалог заблокированного дополнительного шифрования, который ошибочно предлагал задать пароль; теперь во всех восьми языках запрашивается пароль разблокировки.

- Исправлена уязвимость, позволявшая отключить дополнительное шифрование оформления текста без проверки пароля; теперь правильный дополнительный пароль необходимо вводить повторно даже в разблокированном состоянии.
- Оформление текста теперь скрывает префикс протокола, соль и IV; локальный кэш отправки больше не хранит исходный текст.
- Дополнительное шифрование перенесено в Профиль > Конфиденциальность сообщений и применяется ко всем чатам устройства.

- Зашифрованные чаты теперь работают по принципу fail-closed: ошибки шифрования, распределения ключей или защищённого хранения больше не приводят к отправке открытого текста. Для каждого сообщения показывается фактический протокол: `PQ v2`, `X25519 ↓` или `SK vN`.
- Добавлены необязательный пароль для истории и восемь кодеков представления: буддийский текст, случайный китайский, символы И-цзина, корейский, египетские иероглифы, клинопись, текст основных ценностей и буквенно-цифровой формат.
- Без правильного дополнительного пароля виден только оформленный шифротекст; доступна автоблокировка через 5/15/30/60 минут после ухода приложения в фон. Пароль хранится только в памяти.
- Усилена локальная защита закрытых ключей и Sender Keys: AES-GCM-обёртка IndexedDB в Web и системное защищённое хранилище в нативных клиентах; завершена локализация интерфейса на все восемь языков.

---

## Новое в v2.3.9

- Исправлены старые односторонние записи дружбы, из-за которых отображалось «Уже в друзьях», но контакт оставался невидимым и недоступным для чата; повторное добавление теперь восстанавливает обе стороны связи и сразу обновляет список контактов.

---

## Новое в v2.3.8

- Исправлена неработающая кнопка «Назад» после запуска камеры QR-сканера; при закрытии камера теперь сразу останавливается и освобождается.
- Исправлено повреждение связи при повторной заявке уже добавленному другу; результаты поиска теперь показывают «Уже в друзьях».
- После сквозного шифрования исходящие личные сообщения сразу получают шифротекст в оптимистическом объекте, поэтому открытый текст не сохраняется в ожидании подтверждения сервера.
- Голосовые сообщения автоматически останавливаются на 120 секундах; результат изменения голоса имеет тот же предел.
- Во время записи и звонков экран остаётся включённым, а при уходе со страницы устройства и таймеры освобождаются.
- Клиенты Android, iOS, Windows и macOS защищают локальные приватные ключи идентичности и Sender Keys с помощью защищённого хранилища ОС; Web использует IndexedDB с обёрткой AES-GCM. Кэш чатов и хранение приватных ключей — разные границы безопасности; это заменяет старое описание «четырёхуровневого хранения».

---
