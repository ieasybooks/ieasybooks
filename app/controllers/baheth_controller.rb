class BahethController < ApplicationController
  def redirect_by_youtube_video_id
    redirect_to "https://baheth.ieasybooks.com/watch?v=#{params[:v]}",
                status: :moved_permanently,
                allow_other_host: true
  end

  def redirect_by_youtube_playlist_id
    redirect_to "https://baheth.ieasybooks.com/playlist?list=#{params[:list]}",
                status: :moved_permanently,
                allow_other_host: true
  end
end
