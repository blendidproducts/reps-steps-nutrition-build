import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Community post authoring — server-owned display name and like counters.
 *
 * The CommunityPost fields user_name / likes_count / liked_by are field-level
 * locked (write = admin only), so the client can never forge an author name or
 * inflate a like count by calling the entity API directly. This function derives
 * them from the authenticated identity instead.
 *
 *   { action: "create", caption, photo_url, workout_session_id, workout_stats }
 *   { action: "toggle_like", post_id }
 */

// Strip HTML metacharacters from display names before storing.
const sanitizeName = (name) => {
  if (!name) return '';
  return String(name).replace(/[<>&"']/g, '').trim().slice(0, 50);
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'create';

    // ── Create a post ───────────────────────────────────────────────────────
    if (action === 'create') {
      const caption = typeof body.caption === 'string' ? body.caption.trim().slice(0, 1000) : '';
      const photoUrl = typeof body.photo_url === 'string' ? body.photo_url : null;

      if (!caption && !photoUrl) {
        return Response.json({ error: 'Add a caption or photo' }, { status: 400 });
      }

      // Created with the user-scoped client so the platform stamps the real
      // author (created_by_id) on the record.
      const post = await base44.entities.CommunityPost.create({
        caption,
        photo_url: photoUrl,
        workout_session_id: body.workout_session_id || null,
        workout_stats: body.workout_stats || null,
        is_public: true,
      });

      // Verified display name + zeroed counters, written with the service role
      // (these fields are not client-writable).
      await base44.asServiceRole.entities.CommunityPost.update(post.id, {
        user_name: sanitizeName(user.full_name) || 'Anonymous',
        likes_count: 0,
        liked_by: [],
      });

      return Response.json({ success: true, id: post.id });
    }

    // ── Toggle a like ───────────────────────────────────────────────────────
    if (action === 'toggle_like') {
      const postId = body.post_id;
      if (!postId || typeof postId !== 'string') {
        return Response.json({ error: 'post_id is required' }, { status: 400 });
      }

      const posts = await base44.entities.CommunityPost.filter({ id: postId });
      if (posts.length === 0) {
        return Response.json({ error: 'Post not found' }, { status: 404 });
      }

      const post = posts[0];
      const email = user.email;
      const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
      const hasLiked = likedBy.includes(email);
      const newLikedBy = hasLiked ? likedBy.filter((e) => e !== email) : [...likedBy, email];

      // Count is always recomputed from the verified list, never trusted.
      await base44.asServiceRole.entities.CommunityPost.update(postId, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length,
      });

      return Response.json({ success: true, liked_by: newLikedBy, likes_count: newLikedBy.length });
    }

    return Response.json({ error: 'Invalid action. Use "create" or "toggle_like".' }, { status: 400 });
  } catch (error) {
    console.error('[communityPost]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}