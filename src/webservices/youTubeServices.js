import axios from 'axios';
import {parse, toSeconds} from 'iso8601-duration';

export async function getVideos(query) {
  const totalItems = 200;
  const maxItems = 50;
  const key = 'AIzaSyC5xNTheygg2xc6C7bZkAHIysoEZ795E08';

  let youTubeSearchItemsRetrieved = 0;
  let youTubeSearchItems = [];
  let actualPageToken = '';

  let youTubeVideoItems = [];

  do {
    let response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&q=${query}&key=${key}&maxResults=50&type=video&pageToken=${actualPageToken}`
    );
    response = response.data;
    actualPageToken = response.nextPageToken;
    youTubeSearchItems = [...youTubeSearchItems, ...response.items];
    youTubeSearchItemsRetrieved += response.items.length;

    if (!actualPageToken) break;
  } while (youTubeSearchItemsRetrieved < totalItems);

  let videoIdArray = youTubeSearchItems.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / maxItems);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [];
    }
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);

  videoIdArray = videoIdArray.map((array) => array.map((video) => video.id.videoId).join(','));

  await Promise.all(
    videoIdArray.map(async (searchString) => {
      let response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=id%2Csnippet%2CcontentDetails&key=${key}&type=video&id=${searchString}`
      );
      response = response.data;
      youTubeVideoItems = [...youTubeVideoItems, ...response.items];
    })
  );

  let videos = [];

  youTubeSearchItems.forEach((video) => {
    const videoRequestItem = youTubeVideoItems.find((item) => item.id === video.id.videoId);

    videos.push({
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      publishTime: video.snippet.publishTime,
      publishedAt: video.snippet.publishedAt,
      thumbnails: video.snippet.thumbnails,
      videoId: video.id.videoId,
      description: videoRequestItem.snippet.description,
      duration: {
        raw: videoRequestItem.contentDetails.duration,
        minutes: toSeconds(parse(videoRequestItem.contentDetails.duration)) / 60,
      },
    });
  });

  return videos;
}
