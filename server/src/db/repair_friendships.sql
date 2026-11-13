INSERT INTO friends (user_id, friend_id, status, auto_delete)
SELECT source.friend_id, source.user_id, 'accepted', source.auto_delete
FROM friends AS source
LEFT JOIN friends AS reciprocal
    ON reciprocal.user_id = source.friend_id AND reciprocal.friend_id = source.user_id
WHERE source.status = 'accepted'
    AND (reciprocal.id IS NULL OR reciprocal.status <> 'accepted')
ON DUPLICATE KEY UPDATE friends.auto_delete = VALUES(auto_delete), friends.status = 'accepted';
